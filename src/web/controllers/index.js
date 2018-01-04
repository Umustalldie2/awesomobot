"use strict"

const express = require("express");
const checkAuth = require("../middlewares/checkAuth");

const router = express.Router();

// DEPRECATED
//router.use("/api/v1", require("./api"));

// Rest api routes.
router.use("/api/v2", require("./api/v2/index"));

// Auth routes.
router.use("/auth", require("./auth"));

// Dashboard routes en.
router.use("/dashboard", checkAuth, require("./dashboard"));
// Dashboard routes other lang. (note to self: this wont work!)
//router.use("/:lang/dashboard", checkAuth, require("./dashboard"));

// Homepage en.
router.get("/", (req, res) => {
    res.render("index");
});



const langs = ["es", "fr", "it", "pl", "ie"];
// Homepage other lang.
router.get("/:lang", (req, res, next) => {

    const found = langs.find(e => {
        return e == req.params.lang;
    });
    if (found == undefined) {
        return next();
    } else {
        res.render("index-" + req.params.lang);
    }
});

// Status en.
router.get("/status", (req, res) => {
    res.render("status");
});

// Status en.
router.get("/commands", (req, res) => {
    res.render("commands");
});

module.exports = router;