module.exports = {
  apps : [{
    name: "porto-api",
    script: 'bun',
    watch: false,
    args: "run start",
    cwd: "/var/www/portofolio-api/current",
  }],
};
