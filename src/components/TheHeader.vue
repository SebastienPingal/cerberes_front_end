<script setup lang="ts">
const router = useRouter();
const user_store = useUserStore();
const user = computed(() => user_store.user);

function go_to_profile() {
  router.push("/profile");
}
</script>

<template>
  <div class="header w-max-7xl w-full flex justify-between pb-2 h-12">
    <div class="border rounded p-1 flex place-self-center uppercase cursor-pointer hover:dark:bg-gray-8 font-bold tracking-widest" @click="router.push('/')">
      Cerberes
    </div>
    <div class="flex gap-2">
      <o-button v-if="user" @click="go_to_profile">
        {{ user.User_name }}
      </o-button>
      <o-button v-if="user" type="warning" light @click="user_store.logout">
        Logout
      </o-button>
    </div>
  </div>
</template>
