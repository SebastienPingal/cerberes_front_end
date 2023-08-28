import OnuUI from 'onu-ui'
import { type UserModule } from '~/types'
import 'onu-ui/dist/style.css'

export const install: UserModule = ({ app, router, isClient }) => {
  app.use(OnuUI)
}
