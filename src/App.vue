<template>
  <div id="app">
    <minesweeper></minesweeper>
  </div>
</template>

<script>
import minesweeper from './minesweeper.vue';

export default {
  components: {
    minesweeper: minesweeper
  },

  data: function() {
    return {
      message: 'Hello World',
    };
  },
};
</script>

<style>
#app {
  font-size: 18px;
  font-family: 'Roboto', sans-serif;
  color: blue;
}
</style>
