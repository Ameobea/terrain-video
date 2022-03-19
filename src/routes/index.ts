export async function get() {
  return {
    status: 303,
    headers: {
      location: `/v4`,
    },
  };
}
