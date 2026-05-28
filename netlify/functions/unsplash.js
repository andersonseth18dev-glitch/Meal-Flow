exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!process.env.UNSPLASH_ACCESS_KEY) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "MISSING_KEY", message: "UNSPLASH_ACCESS_KEY is not set." }),
    };
  }

  try {
    const { query } = JSON.parse(event.body);
    const searchQuery = encodeURIComponent(query + " food dish");
    const url = `https://api.unsplash.com/search/photos?query=${searchQuery}&per_page=1&orientation=landscape&client_id=${process.env.UNSPLASH_ACCESS_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    const photo = data.results?.[0];
    if (!photo) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: null }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: photo.urls.regular,
        thumb: photo.urls.small,
        credit: photo.user.name,
        creditLink: photo.user.links.html,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
