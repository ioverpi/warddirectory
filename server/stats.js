const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();

const LoginStat = mongoose.model("LoginStat");

// Owner-only login analytics. Gated by a secret token from the environment so
// the (public) demo credentials can't be used to read it.
//   GET /api/stats?token=YOUR_STATS_TOKEN
router.get("/", async (req, res) => {
    const token = process.env.STATS_TOKEN;
    if (!token || req.query.token !== token) {
        return res.sendStatus(403);
    }

    try {
        const total = await LoginStat.countDocuments();
        const uniqueVisitors = (await LoginStat.distinct("ip")).length;

        const perAccountRaw = await LoginStat.aggregate([
            { $group: { _id: "$email", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        const perAccount = {};
        for (const row of perAccountRaw) perAccount[row._id] = row.count;

        const recent = await LoginStat.find()
            .sort({ at: -1 })
            .limit(25)
            .select("email at ip userAgent -_id");

        return res.send({ totalLogins: total, uniqueVisitors, perAccount, recent });
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }
});

module.exports = router;
