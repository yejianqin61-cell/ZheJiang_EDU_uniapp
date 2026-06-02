<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';

onLaunch(() => {
  console.log('[App] Launched');
  // Note: profile fetch is deferred until user explicitly logs in,
  // to avoid network timeouts during WeChat cold start.
});
</script>

<style>
page { background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
</style>
