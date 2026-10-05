const { pool } = require('../config/database');

function formatUserProfile(u = {}) {
  return {
    id: u.id,
    full_name: u.full_name,
    student_id: u.student_id,
    class_name: u.class_name,
    email: u.email,
    avatar_url: u.avatar_url,
    links: {
      github: u.github_link || '',
      figma: u.figma_link || '',
      postman: u.postman_link || '',
      report: u.report_link || ''
    }
  };
}

async function getUserProfile(userId = 1) {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
  const user = rows[0] || {};
  return formatUserProfile(user);
}

async function updateUserProfile(userId = 1, data = {}) {
  const { full_name, student_id, class_name, email, avatar_url, links } = data;
  const github = links?.github ?? null;
  const figma = links?.figma ?? null;
  const postman = links?.postman ?? null;
  const report = links?.report ?? null;

  await pool.query(
    `UPDATE users SET 
      full_name = COALESCE(?, full_name),
      student_id = COALESCE(?, student_id),
      class_name = COALESCE(?, class_name),
      email = COALESCE(?, email),
      avatar_url = COALESCE(?, avatar_url),
      github_link = COALESCE(?, github_link),
      figma_link = COALESCE(?, figma_link),
      postman_link = COALESCE(?, postman_link),
      report_link = COALESCE(?, report_link)
    WHERE id = ?`,
    [full_name, student_id, class_name, email, avatar_url, github, figma, postman, report, userId]
  );

  return getUserProfile(userId);
}

module.exports = {
  getUserProfile,
  updateUserProfile
};
