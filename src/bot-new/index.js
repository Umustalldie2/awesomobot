"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");

const express = require("express");
const ejs = require("ejs");
const morgan = require("morgan");
const bodyParser = require("body-parser");

const discord = require("discord.js");
const mongoose = require("mongoose");

const client = new discord.Client();

const GuildSchema = require("./database").schema.guild;
const commands = require("./commands");

const utils = require("./utils");
const logConstants = utils.logger;
const logger = utils.globLogger;

const config = utils.globConfig.data;

let build;
try {
    build = JSON.parse(fs.readFileSync(path.join(__dirname, "config", "build.json"))).build;
    build++;
    fs.writeFileSync(path.join(__dirname, "config", "build.json"), JSON.stringify({build}));
} catch(error) {
    console.error(error);
}

mongoose.connect(config.database, {
    useMongoClient: true
});
mongoose.Promise = global.Promise;

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

let guilds = [];

setInterval(() => {

    logger.log(logConstants.LOG_DEBUG, "db saveall, guild count: "+guilds.length);

    for (let i = 0; i < guilds.length; i++) {
        guilds[i].save(err => {
            if (err) {
                logger.log(logConstants.LOG_ERROR, "failed to save guild: "+guilds[i].id+" - "+err);
                return;
            }
        });
    }
}, 5000);

client.on("ready", message => {
    client.user.setActivity(`v2.5.${build} | awesomobeta`);
    logger.log(logConstants.LOG_INFO, "Bot loaded successfully!");
});

client.on("message", message => {
    if (message.author.equals(client.user)) {
        logger.log(logConstants.LOG_DEBUG, "aborting - message came from the bot");
        return;
    }

    // TEMP.
    if (message.guild.id != "405129031445381120") {
        logger.log(logConstants.LOG_DEBUG, "aborting - guild is not the test server");
        return;
    }
    //
    
    logger.log(logConstants.LOG_DEBUG, "message created in guild: "+message.guild.id);

    let guild = guilds.find(e => {
        return e.id == message.guild.id;
    });

    if (!guild) {

        logger.log(logConstants.LOG_DEBUG, "guild not loaded - loading from db");

        GuildSchema.findOne({ id: message.guild.id }, (err, guildDoc) => {
            if (err) {
                return;
                logger.log(logConstants.LOG_ERROR, "could not load guild");
            }

            if (!err && !guildDoc) {

                logger.log(logConstants.LOG_DEBUG, "could not find guild in db, creating new one");

                guildDoc = new GuildSchema({
                    id: message.guild.id,
                    settings: {
                        teamRoles: [
                            {
                                id: "436178480582098954", // rust
                                alias: "rs"
                            },
                            {
                                id: "436178377397764097", // c++
                                alias: "cpp"
                            },
                            {
                                id: "436178242844491776", // javascript
                                alias: "js"
                            },
                            {
                                id: "436178315821318154", // python
                                alias: "py"
                            }
                        ]
                    },
                    groups: [
                        {
                            name: "def",
                            inherits: [],
                            channels: [],
                            roles: [],
                            members: [],
                            badges: []
                        },
                        {
                            name: "hax0r",
                            inherits: ["def"],
                            channels: [],
                            roles: [],
                            members: [],
                            badges: [
                                {
                                    target: "*",
                                    allow: false
                                },
                                {
                                    target: "loltest",
                                    allow: true
                                }
                            ]
                        }
                    ],
                    commands: [
                        {
                            name: "join team",
                            group: "hax0r"
                        }
                    ]
                });
            }

            guilds.push(guildDoc);

            logger.log(logConstants.LOG_DEBUG, "new guid created");

            let first = [];
            let any = [];
            let last = [];
            for (let i = 0; i < commands.length; i++) {
                if (commands[i].data.order === undefined) {
                    any.push(commands[i]);
                    continue;
                }
        
                switch(commands[i].data.order) {
                    case "first":
                        first.push(commands[i]);
                        break;
                    case "any":
                        any.push(commands[i]);
                        break;
                    case "last":
                        last.push(commands[i]);
                        break;
                }
            }
        
            for (let i = 0; i < first.length; i++) {
                if (first[i].check(client, message, guildDoc)) {
                    first[i].call(client, message, guildDoc);
                    if (first[i].data.continue === undefined) {
                        return;
                    }
                    if (first[i].data.continue === false) {
                        return;
                    }
                }
            }
        
            for (let i = 0; i < any.length; i++) {
                if (any[i].check(client, message, guildDoc)) {
                    any[i].call(client, message, guildDoc);
                    if (any[i].data.continue === undefined) {
                        return;
                    }
                    if (any[i].data.continue === false) {
                        return;
                    }
                }
            }
        
            for (let i = 0; i < last.length; i++) {
                if (last[i].check(client, message, guildDoc)) {
                    last[i].call(client, message, guildDoc);
                    if (last[i].data.continue === undefined) {
                        return;
                    }
                    if (last[i].data.continue === false) {
                        return;
                    }
                }
            }
        });
        return;
    }

    logger.log(logConstants.LOG_DEBUG, "guild found");

    let first = [];
    let any = [];
    let last = [];
    for (let i = 0; i < commands.length; i++) {
        if (commands[i].data.order === undefined) {
            any.push(commands[i]);
            continue;
        }

        switch(commands[i].data.order) {
            case "first":
                first.push(commands[i]);
                break;
            case "any":
                any.push(commands[i]);
                break;
            case "last":
                last.push(commands[i]);
                break;
        }
    }

    for (let i = 0; i < first.length; i++) {
        if (first[i].check(client, message, guild)) {
            first[i].call(client, message, guild);
            if (first[i].data.continue === undefined) {
                return;
            }
            if (first[i].data.continue === false) {
                return;
            }
        }
    }

    for (let i = 0; i < any.length; i++) {
        if (any[i].check(client, message, guild)) {
            any[i].call(client, message, guild);
            if (any[i].data.continue === undefined) {
                return;
            }
            if (any[i].data.continue === false) {
                return;
            }
        }
    }

    for (let i = 0; i < last.length; i++) {
        if (last[i].check(client, message, guild)) {
            last[i].call(client, message, guild);
            if (last[i].data.continue === undefined) {
                return;
            }
            if (last[i].data.continue === false) {
                return;
            }
        }
    }

    /*
    for (let i = 0; i < commands.length; i++) {
        if (commands[i].check(client, message, guild)) {
            commands[i].call(client, message, guild);
            return;
        }
    }
    */

    //logger.log(logConstants.LOG_DEBUG, "message was not a command or command check failed");
});

client.on("messageDelete", message => {
    logger.log(logConstants.LOG_DEBUG, "message deleted in guild: "+message.guild.id);
});

client.login(config.token);

// API.

const app = express();
const port = "3001";
const server = http.createServer(app);

app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");

app.set("env", "development");
app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: false
}));
app.set("views", path.join(__dirname, "templates"));
app.use(express.static(path.join(__dirname, "static")));

const guildRouter = express.Router();

app.route("/guilds/:guild_id").get((req, res) => {

    for (let i = 0; i < guilds.length; i++) {
        if (guilds[i].id === req.params.guild_id) {
            
            return res.json(guilds[i]);
        }
    }

    GuildSchema.findOne({ id: req.params.guild_id }, (err, guildDoc) => {
        if (err !== null) {

            return res.json({ error: "404 not found" });
        }

        return res.json(guildDoc);
    });
}).post((req, res) => {

}).put((req, res) => {

}).patch((req, res) => {

}).delete((req, res) => {
    
});

app.route("/guilds/:guild_id/settings").get((req, res) => {

    for (let i = 0; i < guilds.length; i++) {
        if (guilds[i].id === req.params.guild_id) {
            
            return res.json(guilds[i].settings);
        }
    }

    GuildSchema.findOne({ id: req.params.guild_id }, (err, guildDoc) => {
        if (err !== null) {

            return res.json({ error: "404 not found" });
        }

        return res.json(guildDoc.settings);
    });
});
app.route("/guilds/:guild_id/settings/teamroles").get((req, res) => {

    for (let i = 0; i < guilds.length; i++) {
        if (guilds[i].id === req.params.guild_id) {
            
            return res.json(guilds[i].settings.teamRoles);
        }
    }

    GuildSchema.findOne({ id: req.params.guild_id }, (err, guildDoc) => {
        if (err !== null) {

            return res.json({ error: "404 not found" });
        }

        return res.json(guildDoc.settings.teamRoles);
    });
});
app.route("/guilds/:guild_id/settings/teamroles/:teamrole_id").get((req, res) => {

    for (let i = 0; i < guilds.length; i++) {
        if (guilds[i].id === req.params.guild_id) {

            const teamRole = guilds[i].settings.teamRoles.find(e => {
                return e.id === req.params.teamrole_id;
            });
            if (teamRole === undefined) {

                return res.json({ error: "404 not found" });
            }
            
            return res.json(teamRole);
        }
    }

    GuildSchema.findOne({ id: req.params.guild_id }, (err, guildDoc) => {
        if (err !== null) {

            return res.json({ error: "404 not found" });
        }

        const teamRole = guildDoc.settings.teamRoles.find(e => {
            return e.id === req.params.teamrole_id;
        });
        if (teamRole === undefined) {

            return res.json({ error: "404 not found" });
        }
        
        return res.json(teamRole);
    });
});

app.route("/guilds/:guild_id/members").get((req, res) => {

    for (let i = 0; i < guilds.length; i++) {
        if (guilds[i].id === req.params.guild_id) {
            
            return res.json(guilds[i].members);
        }
    }

    GuildSchema.findOne({ id: req.params.guild_id }, (err, guildDoc) => {
        if (err !== null) {

            return res.json({ error: "404 not found" });
        }

        return res.json(guildDoc.members);
    });
});
app.route("/guilds/:guild_id/members/:member_id").get((req, res) => {

    for (let i = 0; i < guilds.length; i++) {
        if (guilds[i].id === req.params.guild_id) {

            const member = guilds[i].members.find(e => {
                return e.id === req.params.member_id;
            });
            if (member === undefined) {

                return res.json({ error: "404 not found" });
            }
            
            return res.json(member);
        }
    }

    GuildSchema.findOne({ id: req.params.guild_id }, (err, guildDoc) => {
        if (err !== null) {

            return res.json({ error: "404 not found" });
        }

        const member = guildDoc.members.find(e => {
            return e.id === req.params.member_id;
        });
        if (member === undefined) {

            return res.json({ error: "404 not found" });
        }
        
        return res.json(member);
    });
});
app.route("/guilds/:guild_id/members/:member_id/stats").get((req, res) => {

    for (let i = 0; i < guilds.length; i++) {
        if (guilds[i].id === req.params.guild_id) {

            const member = guilds[i].members.find(e => {
                return e.id === req.params.member_id;
            });
            if (member === undefined) {

                return res.json({ error: "404 not found" });
            }
            
            return res.json(member.stats);
        }
    }

    GuildSchema.findOne({ id: req.params.guild_id }, (err, guildDoc) => {
        if (err !== null) {

            return res.json({ error: "404 not found" });
        }

        const member = guildDoc.members.find(e => {
            return e.id === req.params.member_id;
        });
        if (member === undefined) {

            return res.json({ error: "404 not found" });
        }
        
        return res.json(member.stats);
    });
});
app.route("/guilds/:guild_id/members/:member_id/stats/:stat_name").get((req, res) => {

    for (let i = 0; i < guilds.length; i++) {
        if (guilds[i].id === req.params.guild_id) {

            const member = guilds[i].members.find(e => {
                return e.id === req.params.member_id;
            });
            if (member === undefined) {

                return res.json({ error: "404 not found" });
            }

            const stat = member.stats.find(e => {
                return e.name === req.params.stat_name;
            });
            if (stat === undefined) {

                return res.json({ error: "404 not found" });
            }
            
            return res.json(stat);
        }
    }

    GuildSchema.findOne({ id: req.params.guild_id }, (err, guildDoc) => {
        if (err !== null) {

            return res.json({ error: "404 not found" });
        }

        const member = guildDoc[i].members.find(e => {
            return e.id === req.params.member_id;
        });
        if (member === undefined) {

            return res.json({ error: "404 not found" });
        }

        const stat = member.stats.find(e => {
            return e.name === req.params.stat_name;
        });
        if (stat === undefined) {

            return res.json({ error: "404 not found" });
        }
        
        return res.json(stat);
    });
});
app.route("/guilds/:guild_id/members/:member_id/badges").get((req, res) => {

    for (let i = 0; i < guilds.length; i++) {
        if (guilds[i].id === req.params.guild_id) {

            const member = guilds[i].members.find(e => {
                return e.id === req.params.member_id;
            });
            if (member === undefined) {

                return res.json({ error: "404 not found" });
            }
            
            return res.json(member.badges);
        }
    }

    GuildSchema.findOne({ id: req.params.guild_id }, (err, guildDoc) => {
        if (err !== null) {

            return res.json({ error: "404 not found" });
        }

        const member = guildDoc.members.find(e => {
            return e.id === req.params.member_id;
        });
        if (member === undefined) {

            return res.json({ error: "404 not found" });
        }
        
        return res.json(member.badges);
    });
});
app.route("/guilds/:guild_id/members/:member_id/badges/:badge_name").get((req, res) => {

    for (let i = 0; i < guilds.length; i++) {
        if (guilds[i].id === req.params.guild_id) {

            const member = guilds[i].members.find(e => {
                return e.id === req.params.member_id;
            });
            if (member === undefined) {

                return res.json({ error: "404 not found" });
            }

            const badge = member.badges.find(e => {
                return e.name === req.params.badge_name;
            });
            if (badge === undefined) {

                return res.json({ error: "404 not found" });
            }
            
            return res.json(badge);
        }
    }

    GuildSchema.findOne({ id: req.params.guild_id }, (err, guildDoc) => {
        if (err !== null) {

            return res.json({ error: "404 not found" });
        }

        const member = guildDoc[i].members.find(e => {
            return e.id === req.params.member_id;
        });
        if (member === undefined) {

            return res.json({ error: "404 not found" });
        }

        const badge = member.badges.find(e => {
            return e.name === req.params.badge_name;
        });
        if (badge === undefined) {

            return res.json({ error: "404 not found" });
        }
        
        return res.json(badge);
    });
});

app.route("/guilds/:guild_id/groups").get((req, res) => {

    for (let i = 0; i < guilds.length; i++) {
        if (guilds[i].id === req.params.guild_id) {
            
            return res.json(guilds[i].groups);
        }
    }

    GuildSchema.findOne({ id: req.params.guild_id }, (err, guildDoc) => {
        if (err !== null) {

            return res.json({ error: "404 not found" });
        }

        return res.json(guildDoc.groups);
    });
});
app.route("/guilds/:guild_id/groups/:group_name").get((req, res) => {

    for (let i = 0; i < guilds.length; i++) {
        if (guilds[i].id === req.params.guild_id) {

            const group = guilds[i].groups.find(e => {
                return e.name === req.params.group_name;
            });
            if (group === undefined) {

                return res.json({ error: "404 not found" });
            }
            
            return res.json(group);
        }
    }

    GuildSchema.findOne({ id: req.params.guild_id }, (err, guildDoc) => {
        if (err !== null) {

            return res.json({ error: "404 not found" });
        }

        const group = guildDoc.groups.find(e => {
            return e.name === req.params.group_name;
        });
        if (group === undefined) {

            return res.json({ error: "404 not found" });
        }
        
        return res.json(group);
    });
});

app.route("/guilds/:guild_id/commands").get((req, res) => {

    for (let i = 0; i < guilds.length; i++) {
        if (guilds[i].id === req.params.guild_id) {
            
            return res.json(guilds[i].commands);
        }
    }

    GuildSchema.findOne({ id: req.params.guild_id }, (err, guildDoc) => {
        if (err !== null) {

            return res.json({ error: "404 not found" });
        }

        return res.json(guildDoc.commands);
    });
});
app.route("/guilds/:guild_id/commands/:command_name").get((req, res) => {

    for (let i = 0; i < guilds.length; i++) {
        if (guilds[i].id === req.params.guild_id) {

            const command = guilds[i].commands.find(e => {
                return e.name === req.params.command_name;
            });
            if (command === undefined) {

                return res.json({ error: "404 not found" });
            }
            
            return res.json(command);
        }
    }

    GuildSchema.findOne({ id: req.params.guild_id }, (err, guildDoc) => {
        if (err !== null) {

            return res.json({ error: "404 not found" });
        }

        const command = guildDoc.commands.find(e => {
            return e.name === req.params.command_name;
        });
        if (command === undefined) {

            return res.json({ error: "404 not found" });
        }
        
        return res.json(command);
    });
});

app.use((req, res, next) => {
	let err = new Error("Not Found");
	err.status = 404;
	next(err);
});

app.use((err, req, res, next) => {
	res.locals.message = err.message;
	res.locals.error = req.app.get("env") === "development" ? err : {};

	res.status(err.status || 500);
	res.render("error");
});

server.on("error", (err) => {
	if (err.syscall !== "listen") {
		throw err;
	}

	let bind = typeof port === "string" ?
		"Pipe " + port :
		"Port " + port;

	switch (err.code) {
		case "EACCES":
			console.error(bind + " requires elevated privileges");
			process.exit(1);
			break;
		case "EADDRINUSE":
			console.error(bind + " is already in use");
			process.exit(1);
			break;
		default:
			throw err;
	}
});

server.on("listening", () => {
	let addr = server.address();
	let bind = typeof addr === "string" ?
		"pipe " + addr :
		"port " + addr.port;
	console.log("API magic happens on port: " + bind);
});

server.listen(port);
