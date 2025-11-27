// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "api-gateway",
      script: "apps/api-gateway/src/index.js",
      instances: "max",
      exec_mode: "cluster",
    },
    {
      name: "auth-service",
      script: "apps/auth-service/src/index.js",
      instances: "max",
      exec_mode: "cluster",
    },
    {
      name: "client-service",
      script: "apps/client-service/src/index.js",
      instances: "max",
      exec_mode: "cluster",
    },
    {
      name: "user-service",
      script: "apps/user-service/src/index.js",
      instances: "max",
      exec_mode: "cluster",
    },
    {
      name: "property-service",
      script: "apps/property-service/src/index.js",
      instances: "max",
      exec_mode: "cluster",
    },
    {
      name: "inventory-service",
      script: "apps/inventory-service/src/index.js",
      instances: "max",
      exec_mode: "cluster",
    },
    {
      name: "socket-service",
      script: "apps/socket-service/src/index.js",
      instances: 1, // Socket.io clustering requires extra setup (sticky sessions)
    },
    {
      name: "notification-service",
      script: "apps/notification-service/src/index.js",
      instances: "max",
      exec_mode: "cluster",
    },
    {
      name: "accounts-service",
      script: "apps/accounts-service/src/index.js",
      instances: "max",
      exec_mode: "cluster",
    },
    {
      name: "order-service",
      script: "apps/order-service/src/index.js",
      instances: "max",
      exec_mode: "cluster",
    },
  ],
};
