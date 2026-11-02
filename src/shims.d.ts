declare interface Window {
  // extend the window
}

// with vite-plugin-vue-markdown, markdown files can be treated as Vue components
declare module '*.md' {
  import { type DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// ts-mls exposes its internal modules through "exports", which "moduleResolution": "node" ignores
declare module 'ts-mls/messageProtection.js' {
  export { unprotectPrivateMessage } from 'ts-mls/dist/src/messageProtection.js'
}

declare module '*.vue' {
  import { type DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
