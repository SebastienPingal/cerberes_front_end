// End-to-end scenario of the MLS flows, driving three browsers (Alice, Bob, then a second device of
// Alice) against a running front-end and back-end:
// identities from the recovery phrase, contacts, a conversation, messages both ways, safety numbers,
// a second device linked with the phrase and added by a commit, a message refused with 409 then sent
// again, persistence, logout, encrypted local storage and the identity change alert.
//
// Run the back-end on an empty database and the front-end dev server, then:
//   E2E_DATABASE_URL=postgres://… pnpm test:e2e
// Browsers come from `pnpm exec playwright install chromium`. Without E2E_DATABASE_URL, the checks
// that need the database (server cleanup, identity swap) are skipped.
import { randomBytes } from 'node:crypto'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'
import pg from 'pg'

const FRONT = process.env.E2E_FRONT_URL ?? 'http://localhost:3333'
const API = process.env.E2E_API_URL ?? 'http://localhost:3000'
const DATABASE_URL = process.env.E2E_DATABASE_URL
const SCREENSHOTS = process.env.E2E_SCREENSHOTS ?? tmpdir()
const PASSWORD = 'Secret123pass'
const results = []
const clients = []
const log = (...args) => console.log(new Date().toISOString().slice(11, 19), ...args)

function check(name, ok, detail = '') {
  results.push({ name, ok })
  log(ok ? 'PASS' : 'FAIL', name, detail)
}

async function new_client(browser, label) {
  const context = await browser.newContext()
  const page = await context.newPage()
  clients.push({ page, label })
  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type()))
      log(`  [${label} console.${msg.type()}]`, msg.text().slice(0, 300))
  })
  page.on('pageerror', error => log(`  [${label} pageerror]`, error.message.slice(0, 300)))
  page.on('response', (response) => {
    const url = response.url()
    if (url.startsWith(API) && response.status() >= 400)
      log(`  [${label} http ${response.status()}]`, response.request().method(), url.replace(API, ''))
  })
  return { context, page, label }
}

async function register(client, name, email) {
  const { page } = client
  await page.goto(FRONT)
  await page.getByText('Register then !').click()
  await page.getByPlaceholder('Name').fill(name)
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password', { exact: true }).fill(PASSWORD)
  await page.getByPlaceholder('Confirm Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Register' }).click()
}

async function create_identity(client) {
  const { page } = client
  await page.getByText('Votre phrase de récupération').waitFor({ timeout: 30000 })
  const items = await page.locator('ol li').allInnerTexts()
  const words = items.map(item => item.trim().split(/\s+/).pop())
  check(`${client.label}: phrase has 12 distinct-looking words`, words.length === 12 && words.every(word => /^[a-z]+$/.test(word)), words.join(' '))
  await page.getByRole('button', { name: 'Je les ai notés' }).click()
  const labels = await page.locator('label').allInnerTexts()
  for (const [index, label] of labels.entries()) {
    const position = Number(label.match(/(\d+)/)[1])
    await page.locator('label input').nth(index).fill(words[position - 1])
  }
  await page.getByRole('button', { name: 'Créer mon identité' }).click()
  await page.getByText('Créez votre première conversation').waitFor({ timeout: 30000 })
  return words.join(' ')
}

async function contact_code(client) {
  const { page } = client
  await page.goto(`${FRONT}/profile`)
  const code = page.getByText('Votre code contact').locator('xpath=following-sibling::div[1]')
  await code.waitFor({ timeout: 20000 })
  const text = (await code.innerText()).trim()
  await page.goto(FRONT)
  return text
}

async function add_contact_in_creator(client, uuid) {
  const { page } = client
  await page.getByRole('button', { name: /Ajoutez votre premier contact|^\+$/ }).click()
  await page.getByPlaceholder('Code contact').fill(uuid)
  await page.getByRole('button', { name: 'Ajouter un contact' }).click()
}

async function open_creator(client) {
  const { page } = client
  const first = page.getByText('Créez votre première conversation')
  const button = page.getByRole('button', { name: 'Créer une conversation' })
  await first.or(button).first().waitFor({ timeout: 30000 })
  if (await first.isVisible())
    await first.click()
  else
    await button.click()
  await page.getByText('Avec qui ?').waitFor()
}

async function send(client, text) {
  const box = client.page.getByPlaceholder('Type a message...')
  await box.fill(text)
  await box.press('Enter')
}

async function wait_for_text(client, text, timeout = 30000) {
  try {
    await client.page.getByText(text, { exact: true }).first().waitFor({ timeout })
    return true
  }
  catch {
    return false
  }
}

async function read_vault(client) {
  return client.page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('cerberes')
    request.onsuccess = () => {
      const transaction = request.result.transaction('records', 'readonly')
      const store = transaction.objectStore('records')
      const keys = store.getAllKeys()
      const values = store.getAll()
      transaction.oncomplete = () => resolve({
        keys: keys.result.map(String),
        bytes: values.result.map(value => Array.from(value.ciphertext)),
      })
    }
    request.onerror = () => reject(request.error)
  }))
}

;(async () => {
  const browser = await chromium.launch()
  const stamp = Date.now()
  try {
    const alice = await new_client(browser, 'alice')
    const bob = await new_client(browser, 'bob')

    // ___ Accounts and identities
    await register(alice, 'Alice', `alice${stamp}@test.dev`)
    const alice_phrase = await create_identity(alice)
    await register(bob, 'Bob', `bob${stamp}@test.dev`)
    await create_identity(bob)
    check('both identities created', true)

    const no_local_storage = await alice.page.evaluate(() => Object.keys(localStorage).filter(key => key !== 'vueuse-color-scheme'))
    check('nothing in localStorage', no_local_storage.length === 0, JSON.stringify(no_local_storage))

    // ___ Contacts both ways, and a 1:1 conversation created by Alice
    const bob_code = await contact_code(bob)
    const alice_code = await contact_code(alice)
    await open_creator(alice)
    await add_contact_in_creator(alice, bob_code)
    await alice.page.getByRole('button', { name: 'Bob' }).first().waitFor({ timeout: 15000 })
    await alice.page.getByRole('button', { name: 'Bob' }).first().click()
    await alice.page.getByText('Avec qui ?').waitFor({ state: 'detached', timeout: 30000 })
    check('alice created the conversation', true)

    // ___ Messages both ways
    await send(alice, 'Bonjour Bob, message chiffré 1')
    check('alice sees her own message', await wait_for_text(alice, 'Bonjour Bob, message chiffré 1', 10000))
    const bob_sees_conversation = await bob.page.getByText('Alice', { exact: true }).first().waitFor({ timeout: 40000 }).then(() => true, () => false)
    check('bob got the welcome and sees the conversation with Alice', bob_sees_conversation)
    if (bob_sees_conversation)
      await bob.page.locator('.btn-contact', { hasText: 'Alice' }).first().click()
    check('bob decrypts alice\'s message', await wait_for_text(bob, 'Bonjour Bob, message chiffré 1', 20000))
    await send(bob, 'Salut Alice, réponse 2')
    check('alice decrypts bob\'s reply', await wait_for_text(alice, 'Salut Alice, réponse 2', 30000))

    // ___ Safety numbers must match on both sides
    await open_creator(bob)
    await add_contact_in_creator(bob, alice_code)
    await bob.page.getByRole('button', { name: 'Alice' }).first().waitFor({ timeout: 15000 })
    await bob.page.getByTitle('Vérifier le code de sécurité').first().click()
    const bob_number = (await bob.page.locator('.font-mono').innerText()).trim()
    await bob.page.getByRole('button', { name: 'Fermer' }).click()
    await bob.page.reload()
    await open_creator(alice)
    await alice.page.getByTitle('Vérifier le code de sécurité').first().click()
    const alice_number = (await alice.page.locator('.font-mono').innerText()).trim()
    check('safety numbers match', /^(\d{5} ){5}\d{5}$/.test(alice_number) && alice_number === bob_number, `${alice_number} / ${bob_number}`)
    await alice.page.getByRole('button', { name: 'Les codes sont identiques' }).click()
    check('contact marked verified', await wait_for_text(alice, 'Vérifié', 5000))
    await alice.page.reload()
    await alice.page.locator('.btn-contact', { hasText: 'Bob' }).first().click()

    // ___ Second device of Alice, while Bob's inbox is held back to force a 409 on his next message
    await bob.page.reload()
    await bob.page.locator('.btn-contact', { hasText: 'Alice' }).first().click()
    await wait_for_text(bob, 'Salut Alice, réponse 2', 20000)
    await bob.page.route('**/inbox', route => route.request().method() === 'GET' ? route.abort() : route.continue())

    const commit_accepted = new Promise((resolve) => {
      alice.page.on('response', (response) => {
        if (response.url().includes('/commits') && response.status() === 201)
          resolve(true)
      })
    })

    const alice2 = await new_client(browser, 'alice2')
    await alice2.page.goto(FRONT)
    await alice2.page.getByPlaceholder('Email').fill(`alice${stamp}@test.dev`)
    await alice2.page.getByPlaceholder('Password').fill(PASSWORD)
    await alice2.page.getByRole('button', { name: 'Log in' }).click()
    await alice2.page.getByText('Nouvel appareil').waitFor({ timeout: 20000 })
    await alice2.page.locator('textarea').fill('not a valid phrase at all')
    await alice2.page.getByRole('button', { name: 'Ajouter cet appareil' }).click()
    check('invalid phrase refused', await wait_for_text(alice2, 'Cette phrase n\'est pas valide', 5000))
    await alice2.page.locator('textarea').fill(alice_phrase)
    await alice2.page.getByRole('button', { name: 'Ajouter cet appareil' }).click()
    check('alice2 linked with the phrase', await alice2.page.getByText('Créez votre première conversation').or(alice2.page.getByText('Créer une conversation')).first().waitFor({ timeout: 30000 }).then(() => true, () => false))

    log('waiting for a member to add alice2 to the group (maintenance runs every 60s)')
    const added = await Promise.race([commit_accepted, new Promise(resolve => setTimeout(() => resolve(false), 130000))])
    check('alice\'s first device added alice2 with a commit', added === true)

    const alice2_sees_conversation = await alice2.page.locator('.btn-contact', { hasText: 'Bob' }).first().waitFor({ timeout: 30000 }).then(() => true, () => false)
    check('alice2 joined the conversation from the welcome', alice2_sees_conversation)
    check('alice2 does not get older history', !(await wait_for_text(alice2, 'Bonjour Bob, message chiffré 1', 3000)))

    const bob_statuses = []
    bob.page.on('response', (response) => {
      if (response.url().includes('/messages') && response.request().method() === 'POST')
        bob_statuses.push(response.status())
    })
    await bob.page.unroute('**/inbox')
    await send(bob, 'Message 3 après le commit')
    await bob.page.waitForTimeout(8000)
    check('bob\'s stale message got 409 then was sent again', bob_statuses[0] === 409 && bob_statuses.includes(201), JSON.stringify(bob_statuses))

    if (alice2_sees_conversation)
      await alice2.page.locator('.btn-contact', { hasText: 'Bob' }).first().click()
    check('alice2 decrypts the new message', await wait_for_text(alice2, 'Message 3 après le commit', 30000))
    check('alice\'s first device decrypts it too', await wait_for_text(alice, 'Message 3 après le commit', 30000))

    await send(alice2, 'Écrit depuis le 2e appareil')
    check('bob receives the message from alice2', await wait_for_text(bob, 'Écrit depuis le 2e appareil', 30000))
    check('alice\'s first device receives it as her own', await wait_for_text(alice, 'Écrit depuis le 2e appareil', 30000))

    // ___ History survives a reload, and logging out then in again reuses the device
    await alice.page.reload()
    await alice.page.locator('.btn-contact', { hasText: 'Bob' }).first().click({ timeout: 20000 })
    check('history survives a reload', await wait_for_text(alice, 'Bonjour Bob, message chiffré 1', 15000))
    await alice.page.getByRole('button', { name: 'Logout' }).click()
    await alice.page.getByRole('button', { name: 'Log in' }).waitFor({ timeout: 15000 })
    const me_status = await alice.page.evaluate(api => fetch(`${api}/users/me`, { credentials: 'include' }).then(response => response.status), API)
    check('logout clears the session cookie', me_status === 401, String(me_status))
    await alice.page.getByPlaceholder('Email').fill(`alice${stamp}@test.dev`)
    await alice.page.getByPlaceholder('Password').fill(PASSWORD)
    await alice.page.getByRole('button', { name: 'Log in' }).click()
    await alice.page.locator('.btn-contact', { hasText: 'Bob' }).first().click({ timeout: 20000 })
    check('same browser logs back in without the phrase', await wait_for_text(alice, 'Bonjour Bob, message chiffré 1', 15000))

    // ___ Nothing readable at rest in the browser
    const vault = await read_vault(alice)
    const decoded = vault.bytes.map(bytes => Buffer.from(bytes).toString('latin1')).join('')
    check('vault records are encrypted', vault.keys.length > 0 && !decoded.includes('Bonjour') && !decoded.includes('Salut Alice'), `${vault.keys.length} records: ${vault.keys.slice(0, 8).join(', ')}`)

    if (!DATABASE_URL) {
      log('E2E_DATABASE_URL is not set: skipping the database checks')
      return
    }
    const db = new pg.Client({ connectionString: DATABASE_URL })
    await db.connect()
    const orphans = await db.query('SELECT count(*)::int AS n FROM "Messages" m WHERE NOT EXISTS (SELECT 1 FROM "Deliveries" d WHERE d."Message_id" = m."Message_id")')
    check('no undeliverable message kept on the server', orphans.rows[0].n === 0, String(orphans.rows[0].n))
    const stock = await db.query('SELECT max(n)::int AS max FROM (SELECT count(*) AS n FROM "KeyPackages" GROUP BY "Device_id") AS per_device')
    check('at most 30 key packages per device', stock.rows[0].max <= 30, String(stock.rows[0].max))

    // ___ Identity change: the server swaps Bob's identity key
    await db.query('UPDATE "Users" SET identity_public_key = $1 WHERE "User_email" = $2', [randomBytes(32), `bob${stamp}@test.dev`])
    await db.end()
    await alice.page.reload()
    check('alice is warned that bob\'s identity changed', await wait_for_text(alice, 'L\'identité de Bob a changé.', 30000))
  }
  catch (error) {
    check('scenario ran to the end', false, error.message)
    for (const client of clients)
      await client.page.screenshot({ path: `${SCREENSHOTS}/cerberes-e2e-${client.label}.png`, fullPage: true }).catch(() => {})
  }
  finally {
    await browser.close()
    const failed = results.filter(result => !result.ok)
    log(`${results.length - failed.length}/${results.length} checks passed`)
    process.exit(failed.length ? 1 : 0)
  }
})()
