<template>
  <div class="login-wrap">
    <div class="login-card">
      <div class="login-head">
        <div class="login-logo"><span class="logo-dot" /></div>
        <h1>车迹 · 管理后台</h1>
        <p class="muted">养车记账数据管理</p>
      </div>

      <el-form :model="form" :rules="rules" ref="formRef" label-position="top" @submit.prevent>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="User" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="请输入密码"
            :prefix-icon="Lock"
            @keyup.enter="onSubmit"
          />
        </el-form-item>
        <el-button type="primary" class="submit" :loading="loading" @click="onSubmit">
          登 录
        </el-button>
      </el-form>

      <div class="hint muted">
        演示账号：<code>demo</code> / <code>123456</code>
        （管理员 <code>admin</code> / <code>admin123</code>）
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useCarStore } from '@/stores/cars'

const auth = useAuthStore()
const carStore = useCarStore()
const router = useRouter()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive({ username: 'demo', password: '123456' })

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function onSubmit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      await auth.login(form.username, form.password)
      await carStore.load()
      ElMessage.success('登录成功')
      router.replace('/dashboard')
    } catch {
      // 错误信息由拦截器统一提示
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.login-wrap {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-card {
  width: 380px;
  padding: 36px 32px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
}
.login-head {
  text-align: center;
  margin-bottom: 24px;
}
.login-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}
.logo-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--neon), var(--neon-2));
  box-shadow: 0 0 16px rgba(0, 212, 255, 0.7);
}
.login-head h1 {
  margin: 0;
  font-size: 22px;
  letter-spacing: 2px;
}
.submit {
  width: 100%;
  margin-top: 6px;
}
.hint {
  margin-top: 18px;
  font-size: 12px;
  text-align: center;
  line-height: 1.8;
}
.hint code {
  color: var(--neon);
  background: rgba(0, 212, 255, 0.08);
  padding: 1px 6px;
  border-radius: 4px;
}
</style>
