import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { UserInfo } from '../types';
import { login as apiLogin, getUserProfile } from '../api';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>('');
  const user = ref<UserInfo | null>(null);

  const isLoggedIn = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');

  function checkLogin(): boolean {
    const saved = uni.getStorageSync('accessToken');
    if (saved) {
      token.value = saved;
      fetchProfile();
      return true;
    }
    return false;
  }

  async function login() {
    const { code } = await uni.login();
    const res = await apiLogin(code);
    token.value = res.data.accessToken;
    user.value = res.data.user;
    uni.setStorageSync('accessToken', res.data.accessToken);
  }

  async function fetchProfile() {
    try {
      const res = await getUserProfile();
      user.value = res.data;
    } catch {
      logout();
    }
  }

  function logout() {
    token.value = '';
    user.value = null;
    uni.removeStorageSync('accessToken');
    uni.reLaunch({ url: '/pages/login/index' });
  }

  return { token, user, isLoggedIn, isAdmin, checkLogin, login, fetchProfile, logout };
});
