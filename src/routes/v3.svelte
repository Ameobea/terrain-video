<script lang="ts">
  import { initViz } from "../viz";
  import "./index.css";

  const version = 3;
</script>

<div class="root"><div use:initViz={version} /></div>

<style lang="css">
  .root {
    display: flex;
    flex-direction: column;
  }
</style>
