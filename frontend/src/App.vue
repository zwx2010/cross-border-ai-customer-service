<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { createConversation, sendMessage, type Conversation } from './api';
import { applyTheme, defaultTheme } from './theme/theme';

type Mode = 'agent' | 'customer';
const mode = ref<Mode>('agent'); const language = ref('en'); const input = ref(''); const loading = ref(false); const error = ref('');
const userId = 'demo-user'; const conversations = ref<Conversation[]>([]); const active = ref<Conversation | null>(null);
const title = computed(() => mode.value === 'agent' ? '客服工作台' : '在线客服');

async function startConversation() {
  active.value = await createConversation(userId, language.value); conversations.value = [active.value, ...conversations.value.filter(item => item.id !== active.value?.id)];
}
async function submit() {
  if (!input.value.trim() || loading.value) return; if (!active.value) await startConversation(); if (!active.value) return;
  const query = input.value.trim(); input.value = ''; error.value = ''; loading.value = true; active.value.messages.push({ role: 'user', content: query }); active.value.messages.push({ role: 'assistant', content: '' });
  try { await sendMessage(active.value.id, userId, query, event => { const messages = active.value?.messages ?? []; const last = messages[messages.length - 1]; if (event.type === 'delta' && last) last.content += String(event.text ?? ''); if (event.type === 'error') error.value = String(event.message ?? '回复失败'); }); }
  catch { error.value = '连接失败，请稍后重试'; } finally { loading.value = false; }
}
onMounted(() => applyTheme(defaultTheme));
</script>

<template>
  <div class="shell" :class="mode">
    <aside v-if="mode === 'agent'" class="sidebar"><div class="brand">跨境客服</div><button class="new" @click="startConversation">+ 新建会话</button><div class="session" v-for="item in conversations" :key="item.id" @click="active = item"><strong>{{ item.language?.toUpperCase() || '三语' }}</strong><span>{{ item.handoffStatus === 'bot' ? '机器人处理中' : '等待人工' }}</span></div></aside>
    <main class="content">
      <header><div><small>Customer Service</small><h1>{{ title }}</h1></div><div class="toolbar"><button :class="{ selected: mode === 'agent' }" @click="mode = 'agent'">工作台</button><button :class="{ selected: mode === 'customer' }" @click="mode = 'customer'">聊天页</button><select v-model="language"><option value="en">English</option><option value="vi">Tiếng Việt</option><option value="th">ไทย</option></select></div></header>
      <section class="workspace"><div class="chat-card"><div class="chat-head"><span>智能客服</span><span class="status"><i />{{ active?.handoffStatus === 'bot' ? '在线' : '人工处理中' }}</span></div><div class="messages"><div v-if="!active?.messages.length" class="empty">输入问题开始对话</div><div v-for="(message, index) in active?.messages" :key="index" class="message" :class="message.role"><span>{{ message.role === 'user' ? '你' : '客服机器人' }}</span><p>{{ message.content || (loading ? '正在思考…' : '') }}</p></div></div><div v-if="error" class="error">{{ error }} <button @click="error = ''">关闭</button></div><form class="composer" @submit.prevent="submit"><input v-model="input" :disabled="loading" placeholder="输入商品、物流或售后问题…" /><button :disabled="loading || !input.trim()">发送</button></form></div><aside v-if="mode === 'agent'" class="details"><h2>会话信息</h2><dl><dt>语言</dt><dd>{{ language.toUpperCase() }}</dd><dt>接管状态</dt><dd>{{ active?.handoffStatus === 'bot' ? '机器人处理中' : '需要人工关注' }}</dd><dt>知识来源</dt><dd>由 Dify 工作流返回</dd></dl><div class="handoff">人工转接会在高风险售后、恶劣语气或明确请求时自动触发。</div></aside></section>
    </main>
  </div>
</template>
