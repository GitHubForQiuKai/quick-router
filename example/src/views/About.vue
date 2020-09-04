<template>
  <div class="about">
    <h1>This is an about page</h1>
    <router-link to="/about/detail/123">Detail</router-link>

    <router-view />
  </div>
</template>

<script>
// @ is an alias to /src

export default {
  name: 'about'
};
</script>