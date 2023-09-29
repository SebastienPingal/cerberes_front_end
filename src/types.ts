import { type ViteSSGContext } from 'vite-ssg'

export interface IUser {
  User_id: number
  User_name: string
  User_email: string
  User_password?: string
  User_contact_uuid?: string
  encryption_public_key?: string
  signing_public_key?: string
  contact_list?: IContact[]
}

export interface IContact {
  Contact_id: number
  User_id: number
  Contact_User_id: number
  User: {
    User_name: string
    PGP_PublicKey: string
  }
}

export interface IConversation {
  Conversation_id: number
  Users: IUser[]
  Messages?: IMessage[]
}

export interface IUserConversation {
  UserConversation_id: number
  User_id: number
  Conversation_id: number
}

export interface IMessage {
  Message_id: number
  Conversation_id: numbedarkr
  Sender_id: number
  Message_content: string
  createdAt: string
}

export type UserModule = (ctx: ViteSSGContext) => void
