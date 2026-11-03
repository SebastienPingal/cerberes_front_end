import { acceptHMRUpdate, defineStore } from 'pinia'
import type { ClientConfig, ClientState, KeyPackage } from 'ts-mls'
import type { IConversation, IConversationMember, IInboxMessage, IMessage, IPublicUser } from '../types'
import { api, error_message, is_status } from '../api'
import { from_base64, to_base64, utf8_decode, utf8_encode } from '../crypto/encoding'
import {
  create_group,
  create_membership_commit,
  decode_key_package,
  decode_state,
  encode_state,
  encrypt_application_message,
  epoch_of,
  generate_key_package,
  is_active,
  join_from_welcome,
  key_package_owner,
  list_members,
  make_client_config,
  process_incoming_message,
  wipe,
} from '../crypto/mls'
import { vault_get, vault_set } from '../crypto/vault'

const POLL_INTERVAL = 5 * 1000
const MAINTENANCE_INTERVAL = 60 * 1000
const INBOX_PAGE_SIZE = 100
// A message that keeps failing is eventually dropped, so it can't block its conversation forever
const MAX_PROCESSING_ATTEMPTS = 5

interface ApplicationPayload {
  v: 1
  type: 'text'
  text: string
  sent_at: string
}

export const useConversationStore = defineStore('conversation', () => {
  const user_store = useUserStore()
  const device_store = useDeviceStore()
  const directory_store = useDirectoryStore()

  const conversations: Ref<IConversation[]> = ref([])
  const messages: Ref<Record<string, IMessage[]>> = ref({})
  const selected_conversation_id: Ref<string | null> = ref(null)
  const syncing = ref(false)
  let sync_promise: Promise<void> | null = null

  // MLS states are kept out of Vue reactivity: they are large and immutable
  const groups = new Map<string, ClientState>()
  const failures = new Map<number, number>()
  let client_config: ClientConfig | null = null
  let poll_timer: ReturnType<typeof setInterval> | null = null
  let last_maintenance = 0

  const selected_conversation = computed(() =>
    conversations.value.find(conversation => conversation.Conversation_id === selected_conversation_id.value) ?? null,
  )

  const selected_messages = computed(() =>
    selected_conversation_id.value ? messages.value[selected_conversation_id.value] ?? [] : [],
  )

  function prefix() {
    return `u${user_store.user?.User_id}:`
  }

  function config(): ClientConfig {
    if (!client_config)
      client_config = make_client_config(directory_store.trusted_identity)
    return client_config
  }

  // ___________________________________
  // Local persistence, in the encrypted vault

  async function load() {
    reset()
    conversations.value = await vault_get<IConversation[]>(`${prefix()}conversations`) ?? []
    for (const conversation of conversations.value) {
      const encoded_state = await vault_get<Uint8Array>(`${prefix()}group:${conversation.Conversation_id}`)
      if (encoded_state)
        groups.set(conversation.Conversation_id, decode_state(encoded_state, config()))
      messages.value[conversation.Conversation_id] = await vault_get<IMessage[]>(`${prefix()}history:${conversation.Conversation_id}`) ?? []
    }
  }

  async function save_group(Conversation_id: string, state: ClientState) {
    groups.set(Conversation_id, state)
    await vault_set(`${prefix()}group:${Conversation_id}`, encode_state(state))
  }

  async function save_conversations() {
    await vault_set(`${prefix()}conversations`, conversations.value)
  }

  async function save_history(Conversation_id: string) {
    await vault_set(`${prefix()}history:${Conversation_id}`, messages.value[Conversation_id] ?? [])
  }

  async function add_message(message: IMessage) {
    const history = messages.value[message.Conversation_id] ?? []
    if (history.some(existing => existing.id === message.id))
      return
    history.push(message)
    history.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    messages.value[message.Conversation_id] = history
    await save_history(message.Conversation_id)
  }

  // Names of the other users of a group, from its MLS members
  async function members_of(state: ClientState): Promise<IConversationMember[]> {
    const own_id = user_store.user?.User_id
    const user_ids = [...new Set(list_members(state).map(member => member.User_id))].filter(id => id !== own_id)
    const members: IConversationMember[] = []
    for (const User_id of user_ids) {
      let User_name = user_store.contact_name(User_id)
      if (!User_name) {
        try {
          User_name = (await directory_store.fetch_entry(User_id)).User_name
        }
        catch {
          User_name = `#${User_id}`
        }
      }
      members.push({ User_id, User_name })
    }
    return members
  }

  async function upsert_conversation(Conversation_id: string, state: ClientState) {
    const updated: IConversation = {
      Conversation_id,
      members: await members_of(state),
      active: is_active(state),
      updatedAt: new Date().toISOString(),
    }
    const index = conversations.value.findIndex(conversation => conversation.Conversation_id === Conversation_id)
    if (index === -1)
      conversations.value.push(updated)
    else
      conversations.value[index] = updated
    await save_conversations()
  }

  // ___________________________________
  // Group membership

  async function create_conversation(contacts: IPublicUser[]) {
    const this_device = device_store.device
    if (!this_device)
      throw new Error('This device is not set up')
    if (!contacts.length)
      throw new Error('No members in conversation')

    const { data } = await api.post('/conversations')
    const Conversation_id = data.Conversation_id as string
    // The creator's own leaf comes from a key package that is never published
    const own_key_package = await generate_key_package(this_device)
    const state = await create_group(Conversation_id, own_key_package, config())
    await save_group(Conversation_id, state)
    await upsert_conversation(Conversation_id, state)

    await add_missing_devices(Conversation_id, [this_device.User_id, ...contacts.map(contact => contact.User_id)])
    selected_conversation_id.value = Conversation_id
  }

  // Add every certified device of the given users (by default, of the current members) that is
  // not in the group yet: new devices of a contact, or of the user themselves.
  async function add_missing_devices(Conversation_id: string, user_ids?: number[]) {
    const state = groups.get(Conversation_id)
    if (!state || !is_active(state))
      return

    const members = list_members(state)
    const present = new Set(members.map(member => member.Device_id))
    const wanted_users = user_ids ?? [...new Set(members.map(member => member.User_id))]

    const missing: { Device_id: string; User_id: number }[] = []
    for (const User_id of wanted_users) {
      for (const certified of await directory_store.certified_devices(User_id)) {
        if (!present.has(certified.Device_id))
          missing.push({ Device_id: certified.Device_id, User_id })
      }
    }
    if (!missing.length)
      return

    const { data } = await api.post('/key_packages/claim', { Device_ids: missing.map(item => item.Device_id) })
    const added: { Device_id: string; KeyPackage_ref: string; key_package: KeyPackage }[] = []
    for (const claimed of data as { Device_id: string; KeyPackage_ref: string; key_package: string }[]) {
      const key_package = decode_key_package(from_base64(claimed.key_package))
      const owner = key_package_owner(key_package)
      const expected = missing.find(item => item.Device_id === claimed.Device_id)
      // The key package must really belong to the device the server says it is for
      if (!owner || !expected || owner.Device_id !== claimed.Device_id || owner.User_id !== expected.User_id)
        continue
      added.push({ Device_id: claimed.Device_id, KeyPackage_ref: claimed.KeyPackage_ref, key_package })
    }
    if (!added.length)
      return

    const output = await create_membership_commit(state, added.map(item => item.key_package), [])
    try {
      await api.post(`/conversations/${Conversation_id}/commits`, {
        epoch: epoch_of(state),
        commit: to_base64(output.commit),
        welcome: output.welcome ? to_base64(output.welcome) : null,
        added: added.map(item => ({ Device_id: item.Device_id, KeyPackage_ref: item.KeyPackage_ref })),
        removed: [],
      })
    }
    catch (error) {
      // Another member committed first: the next sync processes their commit, and a later
      // maintenance retries if the devices are still missing
      if (is_status(error, 409))
        return
      throw error
    }
    // Only an accepted commit may replace the current state
    await save_group(Conversation_id, output.new_state)
    wipe(output.consumed)
    await upsert_conversation(Conversation_id, output.new_state)
  }

  // ___________________________________
  // Messages

  async function send_message(text: string) {
    const Conversation_id = selected_conversation_id.value
    const this_device = device_store.device
    if (!Conversation_id || !this_device)
      throw new Error('No selected conversation')

    const sent_at = new Date().toISOString()
    const payload: ApplicationPayload = { v: 1, type: 'text', text, sent_at }

    for (let attempt = 0; attempt < 2; attempt++) {
      const state = groups.get(Conversation_id)
      if (!state || !is_active(state))
        throw new Error('You are no longer in this conversation')

      const output = await encrypt_application_message(state, utf8_encode(JSON.stringify(payload)))
      try {
        const { data } = await api.post(`/conversations/${Conversation_id}/messages`, {
          epoch: epoch_of(state),
          message: to_base64(output.message),
        })
        await save_group(Conversation_id, output.new_state)
        wipe(output.consumed)
        await add_message({
          id: `${Conversation_id}:${data.Message_id}`,
          Conversation_id,
          Sender_id: this_device.User_id,
          Sender_device_id: this_device.Device_id,
          text,
          createdAt: sent_at,
        })
        return
      }
      catch (error) {
        // The group moved to a new epoch: process the pending commit, then encrypt again
        if (is_status(error, 409) && attempt === 0) {
          await sync()
          continue
        }
        throw new Error(error_message(error))
      }
    }
  }

  async function process_inbox_message(message: IInboxMessage) {
    const { Conversation_id } = message
    const bytes = from_base64(message.payload)

    if (message.kind === 'welcome') {
      const current = groups.get(Conversation_id)
      if (current && is_active(current))
        return
      const key_package = message.KeyPackage_ref ? await device_store.load_key_package(message.KeyPackage_ref) : null
      if (!key_package)
        throw new Error('Welcome for an unknown key package')
      const state = await join_from_welcome(bytes, key_package, config())
      if (utf8_decode(state.groupContext.groupId) !== Conversation_id)
        throw new Error('Welcome for another group')
      await save_group(Conversation_id, state)
      await device_store.delete_key_package(key_package.KeyPackage_ref)
      await upsert_conversation(Conversation_id, state)
      return
    }

    const state = groups.get(Conversation_id)
    // Nothing to do for a group this device is not (or no longer) part of
    if (!state || !is_active(state))
      return

    const result = await process_incoming_message(state, bytes)
    await save_group(Conversation_id, result.new_state)
    wipe(result.consumed)

    if (result.kind === 'state') {
      await upsert_conversation(Conversation_id, result.new_state)
      return
    }

    let payload: ApplicationPayload
    try {
      payload = JSON.parse(utf8_decode(result.plaintext)) as ApplicationPayload
    }
    catch {
      throw new Error('Unreadable message content')
    }
    if (payload.v !== 1 || payload.type !== 'text' || typeof payload.text !== 'string')
      return
    await add_message({
      id: `${Conversation_id}:${message.Message_id}`,
      Conversation_id,
      Sender_id: result.sender.User_id,
      Sender_device_id: result.sender.Device_id,
      text: payload.text,
      createdAt: typeof payload.sent_at === 'string' ? payload.sent_at : message.createdAt,
      new: Conversation_id !== selected_conversation_id.value,
    })
  }

  // A conversation can't move forward while one of its members has an unaccepted identity change
  function blocked_by_identity_change(Conversation_id: string) {
    const conversation = conversations.value.find(item => item.Conversation_id === Conversation_id)
    return !!conversation?.members.some(member => directory_store.changes[member.User_id])
  }

  // Process the inbox in the order the server accepted the messages, then acknowledge them.
  // Concurrent calls share the same run, so a caller can wait for the inbox to be processed.
  function sync(): Promise<void> {
    if (!sync_promise) {
      sync_promise = run_sync().finally(() => {
        sync_promise = null
      })
    }
    return sync_promise
  }

  async function run_sync() {
    if (device_store.status !== 'ready')
      return
    syncing.value = true
    try {
      while (true) {
        const { data } = await api.get('/inbox')
        const inbox = data as IInboxMessage[]
        if (!inbox.length)
          break

        const acknowledged: number[] = []
        const blocked = new Set<string>()
        for (const message of inbox) {
          if (blocked.has(message.Conversation_id))
            continue
          try {
            await process_inbox_message(message)
            acknowledged.push(message.Message_id)
            failures.delete(message.Message_id)
          }
          catch (error) {
            console.error(`Unable to process message ${message.Message_id}:`, error_message(error))
            const attempts = (failures.get(message.Message_id) ?? 0) + 1
            failures.set(message.Message_id, attempts)
            if (attempts >= MAX_PROCESSING_ATTEMPTS && !blocked_by_identity_change(message.Conversation_id)) {
              acknowledged.push(message.Message_id)
              failures.delete(message.Message_id)
              if (message.kind === 'application') {
                await add_message({
                  id: `${message.Conversation_id}:${message.Message_id}`,
                  Conversation_id: message.Conversation_id,
                  Sender_id: message.sender.User_id ?? 0,
                  Sender_device_id: message.sender.Device_id,
                  text: '',
                  createdAt: message.createdAt,
                  error: 'Message illisible sur cet appareil',
                })
              }
            }
            else {
              // Later messages of this conversation depend on this one: keep them for the next sync
              blocked.add(message.Conversation_id)
            }
          }
        }

        if (acknowledged.length)
          await api.post('/inbox/ack', { Message_ids: acknowledged })
        if (inbox.length < INBOX_PAGE_SIZE || !acknowledged.length)
          break
      }

      if (Date.now() - last_maintenance > MAINTENANCE_INTERVAL) {
        last_maintenance = Date.now()
        await maintenance()
      }
    }
    catch (error) {
      console.error('Sync failed:', error_message(error))
    }
    finally {
      syncing.value = false
    }
  }

  async function maintenance() {
    await device_store.replenish_key_packages()
      .catch(error => console.error('Unable to publish key packages:', error_message(error)))
    if (user_store.user)
      await directory_store.observe(user_store.user.contact_list.map(contact => contact.User))
    for (const conversation of conversations.value) {
      if (!conversation.active)
        continue
      await add_missing_devices(conversation.Conversation_id)
        .catch(error => console.error(`Unable to add devices to ${conversation.Conversation_id}:`, error_message(error)))
    }
  }

  function start() {
    stop()
    last_maintenance = 0
    sync()
    poll_timer = setInterval(sync, POLL_INTERVAL)
  }

  function stop() {
    if (poll_timer)
      clearInterval(poll_timer)
    poll_timer = null
  }

  async function select(Conversation_id: string) {
    selected_conversation_id.value = Conversation_id
    const history = messages.value[Conversation_id]
    if (history?.some(message => message.new)) {
      history.forEach(message => message.new = false)
      await save_history(Conversation_id)
    }
  }

  function reset() {
    stop()
    groups.clear()
    failures.clear()
    client_config = null
    conversations.value = []
    messages.value = {}
    selected_conversation_id.value = null
  }

  return {
    conversations,
    messages,
    selected_conversation_id,
    selected_conversation,
    selected_messages,
    syncing,
    load,
    start,
    stop,
    sync,
    select,
    create_conversation,
    send_message,
    reset,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useConversationStore, import.meta.hot))
