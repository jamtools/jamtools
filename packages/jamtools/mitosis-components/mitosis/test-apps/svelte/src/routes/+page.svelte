<script>
  import { AutoComplete, Todos, Edit } from '@jamtools-components/library-svelte';
</script>

<!-- <h1>Welcome to SvelteKit</h1> -->
<!-- <AutoComplete /> -->
<!-- <Todos /> -->
<Edit
  editing={true}
  onEdit={() => {console.log('editing')}}
  onCancelEdit={() => {console.log('cancel')}}
  waiting={true}
  captured={null}
  saved={[{
    deviceInfo: {
        manufacturer: 'd',
        name: 'My MIDI input',
        subtype: 'midi_input',
        type: 'midi',
    },
    event: {
      channel: 1,
      number: 23,
      type: 'noteon',
      value: 20,
      velocity: 100,
    },
    type: 'midi',
  }]}
  askDeleteSavedValue={() => {}}
  confirmMacro={() => ({})}
  toggleWaiting={() => ({})}
/>
<!-- <p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p> -->
