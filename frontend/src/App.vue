<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { createConversation, deleteConversation, getConversation, listConversations, requestHandoff, sendMessage, type Conversation } from './api';
import { applyTheme, defaultTheme } from './theme/theme';

type Mode = 'agent' | 'customer';
const mode = ref<Mode>('agent'); const language = ref('en'); const input = ref(''); const loading = ref(false); const switching = ref(false); const error = ref('');
function getBrowserUserId(): string {
  const storageKey = 'cross-border-customer-service:user-id';
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;
  const created = `web-${crypto.randomUUID()}`;
  window.localStorage.setItem(storageKey, created);
  return created;
}
const userId = getBrowserUserId(); const conversations = ref<Conversation[]>([]); const active = ref<Conversation | null>(null);
const contextMenu = ref<{ id: string; x: number; y: number } | null>(null);
const title = computed(() => mode.value === 'agent' ? '客服工作台' : '在线客服');
function visibleContent(content: string): string {
  return content
    .replace(/<think(?:ing)?\b[^>]*>[\s\S]*?(?:<\/think(?:ing)?>|$)/gi, '')
    .replace(/<\/think(?:ing)?>/gi, '')
    .trim();
}
function shouldShowMessage(message: { role: string; content: string }, index: number): boolean {
  const isCurrentThinking = loading.value && message.role === 'assistant' && index === (active.value?.messages.length ?? 0) - 1;
  return message.role === 'user' || Boolean(visibleContent(message.content)) || isCurrentThinking;
}
function messageText(message: { role: string; content: string }, index: number): string {
  return visibleContent(message.content) || (loading.value && message.role === 'assistant' && index === (active.value?.messages.length ?? 0) - 1 ? '正在思考…' : '');
}

async function startConversation() {
  try { active.value = await createConversation(userId, language.value); conversations.value = [active.value, ...conversations.value.filter(item => item.id !== active.value?.id)]; error.value = ''; }
  catch { error.value = '新建会话失败，请检查客服服务是否运行'; }
}
async function selectConversation(id: string) {
  contextMenu.value = null;
  switching.value = true;
  try { active.value = await getConversation(id, userId); error.value = ''; }
  catch { error.value = '会话加载失败，请稍后重试'; }
  finally { switching.value = false; }
}
function openContextMenu(event: MouseEvent, conversation: Conversation) {
  contextMenu.value = { id: conversation.id, x: event.clientX, y: event.clientY };
}
async function removeConversation() {
  const target = contextMenu.value;
  contextMenu.value = null;
  if (!target) return;
  if (!window.confirm('确定删除这个会话吗？会话消息和转人工记录也会一并删除。')) return;
  try {
    await deleteConversation(target.id, userId);
    conversations.value = conversations.value.filter(item => item.id !== target.id);
    if (active.value?.id === target.id) {
      active.value = conversations.value[0] ?? null;
      if (active.value) await selectConversation(active.value.id);
    }
    error.value = '';
  } catch { error.value = '删除会话失败，请稍后重试'; }
}
async function handoff() {
  if (!active.value) { error.value = '请先选择会话'; return; }
  switching.value = true;
  try { await requestHandoff(active.value.id, userId, 'manual_request', active.value.summary); active.value.handoffStatus = 'waiting_human'; active.value.handoffReason = 'manual_request'; error.value = '已通知人工客服，请等待接管'; }
  catch { error.value = '转人工失败，请检查飞书通知配置后重试'; }
  finally { switching.value = false; }
}
async function submit() {
  if (!input.value.trim() || loading.value) return; if (!active.value) await startConversation(); if (!active.value) return;
  const query = input.value.trim(); input.value = ''; error.value = ''; loading.value = true; active.value.messages.push({ role: 'user', content: query }); active.value.messages.push({ role: 'assistant', content: '' });
  try { await sendMessage(active.value.id, userId, query, event => { const messages = active.value?.messages ?? []; const last = messages[messages.length - 1]; if (event.type === 'delta' && last) last.content += String(event.text ?? ''); if (event.type === 'error') error.value = String(event.message ?? '回复失败'); }); }
  catch (cause) {
    error.value = cause instanceof Error && cause.message && cause.message !== 'message_send_failed'
      ? `Dify：${cause.message}`
      : '连接失败，请稍后重试';
  } finally { loading.value = false; }
}
onMounted(async () => {
  applyTheme(defaultTheme);
  try {
    conversations.value = await listConversations(userId);
    if (conversations.value.length) active.value = conversations.value[0];
    else await startConversation();
  } catch { error.value = '无法加载历史会话'; }
});
</script>

<template>
  <div class="shell" :class="mode" @click="contextMenu = null">
    <aside v-if="mode === 'agent'" class="sidebar"><div class="brand">跨境客服</div><button class="new" @click.stop="startConversation">+ 新建会话</button><div class="session" v-for="item in conversations" :key="item.id" :class="{ active: active?.id === item.id }" @click.stop="selectConversation(item.id)" @contextmenu.prevent.stop="openContextMenu($event, item)"><strong>{{ item.language?.toUpperCase() || '三语' }}</strong><span>{{ item.handoffStatus === 'bot' ? '机器人处理中' : '等待人工' }}</span></div></aside>
    <div v-if="contextMenu" class="context-menu" :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }" @click.stop><button class="delete-action" @click="removeConversation">删除会话</button></div>
    <main class="content">
      <header><div><small>Customer Service</small><h1>{{ title }}</h1></div><div class="toolbar"><button :class="{ selected: mode === 'agent' }" @click="mode = 'agent'">工作台</button><button :class="{ selected: mode === 'customer' }" @click="mode = 'customer'">聊天页</button><button v-if="mode === 'agent'" class="new-inline" @click="startConversation">新建会话</button><select v-model="language"><option value="en">English</option><option value="vi">Tiếng Việt</option><option value="th">ไทย</option></select></div></header>
      <section class="workspace"><div class="chat-card"><div class="chat-head"><span>智能客服</span><span class="status"><i />{{ active?.handoffStatus === 'bot' ? '在线' : '人工处理中' }}</span></div><div class="messages"><div v-if="!active?.messages.length" class="empty">输入问题开始对话</div><template v-for="(message, index) in active?.messages" :key="index"><div v-if="shouldShowMessage(message, index)" class="message" :class="message.role"><span>{{ message.role === 'user' ? '你' : '客服机器人' }}</span><p>{{ messageText(message, index) }}</p></div></template></div><div v-if="error" class="error">{{ error }} <button @click="error = ''">关闭</button></div><form class="composer" @submit.prevent="submit"><input v-model="input" :disabled="loading || switching" placeholder="输入商品、物流或售后问题…" /><button :disabled="loading || switching || !input.trim()">发送</button></form></div><aside v-if="mode === 'agent'" class="details"><h2>会话信息</h2><dl><dt>语言</dt><dd>{{ language.toUpperCase() }}</dd><dt>接管状态</dt><dd>{{ active?.handoffStatus === 'bot' ? '机器人处理中' : '需要人工关注' }}</dd><dt>知识来源</dt><dd>由 Dify 工作流返回</dd></dl><button class="handoff-button" :disabled="switching || !active || active.handoffStatus !== 'bot'" @click="handoff">转接人工</button><div class="handoff">人工转接会在高风险售后、恶劣语气或明确请求时自动触发。</div></aside></section>
    </main>
  </div>
</template>
