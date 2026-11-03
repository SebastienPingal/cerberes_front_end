import { type ViteSSGContext } from 'vite-ssg'

// Binary values coming from the API are base64 strings

export interface IPublicUser {
  User_id: number
  User_name: string
  identity_public_key: string | null
}

export interface IContact {
  Contact_id: number
  Contact_User_id: number
  User: IPublicUser
}

export interface IDemand {
  Contact_id: number
  User_id: number
  AddedBy: IPublicUser
}

export interface IUser extends IPublicUser {
  User_email: string
  User_contact_uuid: string
  contact_list: IContact[]
  demands: IDemand[]
}

export interface IDevice {
  Device_id: string
  User_id: number
  Device_name: string
  signature_public_key: string
  certificate: string
  createdAt: string
}

export interface IDirectoryEntry extends IPublicUser {
  devices: IDevice[]
}

export interface IInboxMessage {
  Message_id: number
  Conversation_id: string
  kind: 'commit' | 'welcome' | 'application'
  epoch: number
  payload: string
  // Given by the server for routing only, never trusted
  sender: { Device_id: string; User_id?: number }
  KeyPackage_ref: string | null
  createdAt: string
}

export interface IConversationMember {
  User_id: number
  User_name: string
}

// Local view of an MLS group this device belongs to
export interface IConversation {
  Conversation_id: string
  // Other users of the conversation, read from the MLS ratchet tree
  members: IConversationMember[]
  // False once this device has been removed from the group
  active: boolean
  updatedAt: string
}

export interface IMessage {
  id: string
  Conversation_id: string
  // Sender authenticated by MLS
  Sender_id: number
  Sender_device_id: string
  text: string
  createdAt: string
  new?: boolean
  // Set on a placeholder for a message this device could not decrypt
  error?: string
}

export type UserModule = (ctx: ViteSSGContext) => void
