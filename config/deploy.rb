# config valid for current version and patch releases of Capistrano
lock "~> 3.19.2"

set :application, "portofolio-api"
set :repo_url, "git@github.com:manuTech0/my-portofolio.git"
set :branch, `git rev-parse --abbrev-ref HEAD`.chomp
set :deploy_to, "/var/www/portofolio-api"

append :linked_files, ".env"
append :linked_dirs, "logs", "storage", "node_modules"  # node_modules disarankan untuk cache Bun

set :default_shell, "/bin/bash -l"

set :default_env, {
  'PATH' => "$HOME/.bun/bin:$PATH",
  'BUN_INSTALL' => "$HOME/.bun"
}

set :keep_releases, 5
set :pm2_roles, :app
set :pm2_process_file, "ecosystem.config.js"

# ================================
# TASKS
# ================================

namespace :bun do
  desc "Install dependencies using Bun"
  task :install do
    on roles(:app) do
      within release_path do
        execute :bun, "install", "--no-save", "--frozen-lockfile"
      end
    end
  end

  desc "Run database migrations using Bun"
  task :migrate do
    on roles(:app) do
      within release_path do
        execute :bun, "run", "migrate"
      end
    end
  end
end

namespace :pm2 do
  desc "Restart PM2 application"
  task :restart do
    on roles(:app) do
      within release_path do
        execute "pm2", "reload", "porto-api", "||", "pm2", "start", "bun", "--name", "porto-api", "--", "run", "start"
      end
    end
  end
end

# ================================
# HOOKS
# ================================
after "deploy:updated", "bun:install"
after "bun:install", "bun:migrate"
after "bun:migrate", "pm2:restart"
