const app = require("express")();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

const Config = require("./config.json");
const Constants = require("./constants");
const Utils = require("./utils");
const Aave = require("./aave");

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", (connection) => {
  console.log("Connected");
  connection.on("reserveList", (msg) => {
    let params;
    try {
      params = JSON.parse(msg);
      if (params.chain && Utils.validateChain(params.chain)) {
        Aave.getReservesList(params.chain)
          .then((res) => {
            io.emit("reserveList", {
              success: true,
              data: res,
            });
          })
          .catch((err) => {
            io.emit("reserveList", {
              success: false,
              data: err,
            });
          });
      } else {
        io.emit("reserveList", {
          success: false,
          data: "Provided chain is not supported",
        });
      }
    } catch (e) {
      io.emit("reserveList", {
        success: false,
        data: "Provide parameters in JSON Object",
      });
    }
  });
  connection.on("execute", (msg) => {
    let params;
    try {
      params = JSON.parse(msg);
      if (params.chain && Utils.validateChain(params.chain)) {
        if (params.type == "Deposit") {
          Aave.approveAndDeposit(
            {
              address: Config.address,
              privateKey: Config.privateKey,
            },
            params.token,
            Constants.AAVE.LendingPool[params.chain],
            params.amount,
            params.chain
          )
            .then((res) => {
              io.emit("execute", {
                success: true,
                data: JSON.stringify(res),
              });
            })
            .catch((e) => {
              io.emit("execute", {
                success: false,
                data: `Error occured for execute event: ${e}`,
              });
            });
        } else if (params.type == "Withdraw") {
          Aave.withdrawToken(
            {
              address: Config.address,
              privateKey: Config.privateKey,
            },
            params.token,
            Config.address,
            params.amount,
            params.chain
          )
            .then((res) => {
              io.emit("execute", {
                success: true,
                data: JSON.stringify({withdrawTxHash: res.transactionHash}]),
              });
            })
            .catch((e) => {
              io.emit("execute", {
                success: false,
                data: `Error occured for execute event: ${e}`,
              });
            });
        } else {
          io.emit("execute", {
            success: false,
            data: `Wrong type provided: ${params.type}\nOnly Deposit and Withdraw are available`,
          });
        }
      } else {
        io.emit("execute", {
          success: false,
          data: "Provided chain is not supported",
        });
      }
    } catch (e) {
      io.emit("execute", {
        success: false,
        data: "Provide parameters in JSON Object",
      });
    }
  });
  connection.on("disconnect", () => {
    console.log("Disconnected");
  });
});

server.listen(Config.port, () => {
  console.log(`Server is listing on port ${Config.port}`);
});
