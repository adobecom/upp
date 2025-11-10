export async function logError(response) {
    console.error(`Request failed with status: ${response.status} ${response.statusText}`);

    console.error('Response Headers:');
    for (const [key, value] of response.headers.entries()) {
        console.error(`  ${key}: ${value}`);
    }

    const errorData = await response.text();
    console.error('Error Response Body:', errorData);
}