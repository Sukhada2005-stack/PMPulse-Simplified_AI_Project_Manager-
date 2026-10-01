import db from '../db/database.js';

export const getMyProfile = (req, res) => {
    try {
        const userId = req.user.id;
        let profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(userId);

        if (!profile) {
            const isPM = req.user.user_type === 'pm';
            const isEmployee = req.user.user_type === 'employee';
            const initialRole = isPM ? '' : (isEmployee ? (req.user.role_title || '') : (req.user.role_title || ''));

            db.prepare(`
                INSERT INTO user_profiles (user_id, full_name, role_title, experience, about, resume_name, resume_data, skills, avatar_url)
                VALUES (?, ?, ?, '', '', NULL, NULL, '[]', ?)
            `).run(
                userId,
                req.user.full_name || '',
                initialRole,
                req.user.avatar_url || null
            );

            profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(userId);
        }

        // Clean up any legacy seeded fake data if present on existing profile
        let needClean = false;
        let cleanRole = profile.role_title || '';
        let cleanExp = profile.experience || '';
        let cleanAbout = profile.about || '';
        let cleanResumeName = profile.resume_name;
        let cleanResumeData = profile.resume_data;
        let cleanSkills = profile.skills || '[]';

        if (req.user.user_type === 'pm' && cleanRole === 'Project Manager' && (!cleanAbout || cleanAbout.includes('eager to gain hands-on experience') || cleanAbout.includes('dedicated to architecting scalable solutions'))) {
            cleanRole = '';
            needClean = true;
        }
        if (cleanExp === '10+ years') {
            cleanExp = '';
            needClean = true;
        }
        if (cleanAbout && (cleanAbout.includes('eager to gain hands-on experience in the tech industry') || cleanAbout.includes('dedicated to architecting scalable solutions'))) {
            cleanAbout = '';
            needClean = true;
        }
        if (cleanResumeName && cleanResumeName.endsWith('-resume') && !cleanResumeData) {
            cleanResumeName = null;
            needClean = true;
        }
        if (cleanSkills && cleanSkills.includes('C Programming Language') && cleanSkills.includes('Node.js')) {
            cleanSkills = '[]';
            needClean = true;
        }

        if (needClean) {
            db.prepare(`
                UPDATE user_profiles SET
                    role_title = ?,
                    experience = ?,
                    about = ?,
                    resume_name = ?,
                    skills = ?
                WHERE user_id = ?
            `).run(cleanRole, cleanExp, cleanAbout, cleanResumeName, cleanSkills, userId);
            profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(userId);
        }

        let parsedSkills = [];
        try {
            parsedSkills = JSON.parse(profile.skills || '[]');
        } catch {
            parsedSkills = (profile.skills || '').split(',').map(s => s.trim()).filter(Boolean);
        }

        res.json({
            profile: {
                ...profile,
                skills: parsedSkills
            }
        });
    } catch (err) {
        console.error('Error fetching user profile:', err);
        res.status(500).json({ error: 'Failed to fetch personal profile' });
    }
};

export const updateMyProfile = (req, res) => {
    try {
        const userId = req.user.id;
        const {
            full_name,
            role_title,
            experience,
            about,
            resume_name,
            resume_data,
            resume_type,
            resume_size,
            skills,
            avatar_url
        } = req.body;

        const skillsJson = Array.isArray(skills) ? JSON.stringify(skills) : (skills || '[]');

        // Check if profile exists
        const existing = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(userId);

        if (!existing) {
            db.prepare(`
                INSERT INTO user_profiles (
                    user_id, full_name, role_title, experience, about,
                    resume_name, resume_data, resume_type, resume_size, skills, avatar_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                userId,
                full_name || req.user.full_name,
                role_title !== undefined ? role_title : '',
                experience !== undefined ? experience : '',
                about || '',
                resume_name || null,
                resume_data || null,
                resume_type || null,
                resume_size || null,
                skillsJson,
                avatar_url || null
            );
        } else {
            db.prepare(`
                UPDATE user_profiles SET
                    full_name = COALESCE(?, full_name),
                    role_title = COALESCE(?, role_title),
                    experience = COALESCE(?, experience),
                    about = COALESCE(?, about),
                    resume_name = ?,
                    resume_data = ?,
                    resume_type = ?,
                    resume_size = ?,
                    skills = COALESCE(?, skills),
                    avatar_url = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `).run(
                full_name !== undefined ? full_name : existing.full_name,
                role_title !== undefined ? role_title : existing.role_title,
                experience !== undefined ? experience : existing.experience,
                about !== undefined ? about : existing.about,
                resume_name !== undefined ? resume_name : existing.resume_name,
                resume_data !== undefined ? resume_data : existing.resume_data,
                resume_type !== undefined ? resume_type : existing.resume_type,
                resume_size !== undefined ? resume_size : existing.resume_size,
                skills !== undefined ? skillsJson : existing.skills,
                avatar_url !== undefined ? avatar_url : existing.avatar_url,
                userId
            );
        }

        // Also sync full_name and role_title in users table if modified
        if (full_name && full_name.trim()) {
            db.prepare('UPDATE users SET full_name = ? WHERE id = ?').run(full_name.trim(), userId);
        }
        if (role_title && role_title.trim()) {
            db.prepare('UPDATE users SET role_title = ? WHERE id = ?').run(role_title.trim(), userId);
        }
        if (avatar_url !== undefined) {
            db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatar_url, userId);
        }

        const updated = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(userId);
        let parsedSkills = [];
        try {
            parsedSkills = JSON.parse(updated.skills || '[]');
        } catch {
            parsedSkills = [];
        }

        res.json({
            message: 'Profile updated successfully',
            profile: {
                ...updated,
                skills: parsedSkills
            }
        });
    } catch (err) {
        console.error('Error updating user profile:', err);
        res.status(500).json({ error: 'Failed to update personal profile' });
    }
};

export const downloadMyResume = (req, res) => {
    try {
        const userId = req.user.id;
        const profile = db.prepare('SELECT resume_name, resume_data, resume_type FROM user_profiles WHERE user_id = ?').get(userId);
        if (!profile || !profile.resume_data) {
            return res.status(404).json({ error: 'No resume file uploaded yet' });
        }

        let mimeType = profile.resume_type || 'application/octet-stream';
        let buffer;
        const matches = profile.resume_data.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
            mimeType = matches[1];
            buffer = Buffer.from(matches[2], 'base64');
        } else {
            buffer = Buffer.from(profile.resume_data, 'base64');
        }

        const fileName = profile.resume_name || 'Resume.pdf';
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.send(buffer);
    } catch (err) {
        console.error('Error downloading resume:', err);
        res.status(500).json({ error: 'Failed to download resume' });
    }
};
