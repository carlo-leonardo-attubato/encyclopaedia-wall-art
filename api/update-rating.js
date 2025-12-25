export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fileId, rating } = req.body;

  if (!fileId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Invalid fileId or rating' });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER = 'carlo-leonardo-attubato';
  const REPO_NAME = 'encyclopaedia-wall-art';
  const FILE_PATH = 'data.json';

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GitHub token not configured' });
  }

  try {
    // Get current file content and SHA
    const getResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!getResponse.ok) {
      throw new Error('Failed to fetch current data.json');
    }

    const fileData = await getResponse.json();
    const currentContent = JSON.parse(
      Buffer.from(fileData.content, 'base64').toString('utf8')
    );

    // Update the rating
    const itemIndex = currentContent.findIndex(item => item.file === fileId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }

    currentContent[itemIndex].stars = rating;

    // Commit the updated file
    const updateResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Update rating for ${fileId} to ${rating} stars`,
          content: Buffer.from(JSON.stringify(currentContent, null, 2)).toString('base64'),
          sha: fileData.sha,
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      throw new Error(errorData.message || 'Failed to update data.json');
    }

    return res.status(200).json({ success: true, fileId, rating });
  } catch (error) {
    console.error('Error updating rating:', error);
    return res.status(500).json({ error: error.message });
  }
}
