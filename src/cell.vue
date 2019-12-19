<template>
  <button
    class="cell"
    :class="{
      'cell--revealed': String(value).length > 0,
      'cell--not-revealed': String(value).length == 0,
      'cell--mine': value == api.constants.MINE,
      'cell--flagged-as-mine': value == api.constants.FLAGGED_AS_MINE,
      'cell--flagged-as-possible-mine': value == api.constants.FLAGGED_AS_POSSIBLE_MINE,
      'animated tada': value == api.constants.MINE
    }"
  >
    <div>
      <template v-if="value == api.constants.FLAGGED_AS_MINE">
        <i class="fa fa-flag"></i>
      </template>
      <template v-else-if="value == api.constants.FLAGGED_AS_POSSIBLE_MINE">
        <i class="fa fa-question-circle"></i>
      </template>
      <template v-else-if="value == api.constants.MINE">
        <i class="fa fa-bomb"></i>
      </template>
      <template v-else-if="value">
        {{ value }}
      </template>
    </div>
  </button>
</template>

<script>
export default {
  props: ["value", "api"]
};
</script>
