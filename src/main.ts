import { createApp } from 'vue'
import { registerPlugins } from '@/plugins'
import App from './App.vue'
import '@fontsource/roboto-mono/400.css'
import '@fontsource/roboto-mono/500.css'
import '@fontsource/roboto-mono/700.css'
import 'virtual:uno.css'
import './styles/main.scss'

const app = createApp(App)

registerPlugins(app)

app.mount('#app')
