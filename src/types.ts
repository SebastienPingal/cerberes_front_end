import { type ViteSSGContext } from 'vite-ssg'

export interface IUser {
  User_id: number
  User_name: string
  User_email: string
  User_password?: string
  User_contact_uuid?: string
  encryption_public_key?: Uint8Array
  signing_public_key?: Uint8Array
  contact_list?: IContact[]
}

export interface IContact {
  Contact_id: number
  User_id: number
  Contact_User_id: number
  User: IUser
}

export interface IConversation {
  Conversation_id: number
  Users: IUser[]
  Demands?: boolean
  Messages?: IMessage[]
}

export interface IUserConversation {
  UserConversation_id: number
  User_id: number
  Conversation_id: number
}

export interface IMessage {
  Message_id: number
  Conversation_id: number
  Sender_id: number
  new?: boolean
  Message_content?: Uint8Array
  Message_content_decrypted?: string
  Nonce?: Uint8Array
  createdAt: string
}

export type UserModule = (ctx: ViteSSGContext) => void
