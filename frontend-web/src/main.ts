import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import { registerElementPlus } from './plugins/element-plus'
import './styles/reset.scss'
import './styles/global.scss'

const app = createApp(App)
app.use(createPinia())
app.use(router)
registerElementPlus(app)
app.mount('#app')
