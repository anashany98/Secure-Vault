// Simple IP Blocker (In-memory for demo, but could use DB)
const blockedIPs = new Set();

const ipBlocker = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    if (blockedIPs.has(ip)) {
        return res.status(403).json({ message: "Access denied: Your IP is blocked." });
    }
    next();
};

const blockIP = (ip) => {
    blockedIPs.add(ip);
};

module.exports = { ipBlocker, blockIP };
