<script lang="ts">
    interface Props {
        submit: (data: { name: string }) => void;
    }

    const { submit }: Props = $props();

    let name = $state("");

    async function handleSubmit(event: Event) {
        event.preventDefault();
        await submit({ name });
    }
</script>

<form onsubmit={handleSubmit}>
    <input type="text" name="name" bind:value={name} />
    <button type="submit">Submit</button>
</form>
