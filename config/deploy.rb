# config valid for current version and patch releases of Capistrano
lock "~> 3.19.2"

set :application, "portofolio-api"
set :repo_url, "git@github.com:manuTech0/my-portofolio.git"

# Default branch is :master
# ask :branch, `git rev-parse --abbrev-ref HEAD`.chomp

# Default deploy_to directory is /var/www/my_app_name
set :deploy_to, "/var/www/portofolio-api"

# Default value for :format is :airbrussh.
# set :format, :airbrussh

# You can configure the Airbrussh format using :format_options.
# These are the defaults.
# set :format_options, command_output: true, log_file: "log/capistrano.log", color: :auto, truncate: :auto

# Default value for :pty is false
# set :pty, true

# Default value for :linked_files is []
# append :linked_files, "config/database.yml", 'config/master.key'

# Default value for linked_dirs is []
append :linked_dirs, "logs", "tmp/pids", "tmp/cache", "tmp/sockets", "public/system", "vendor", "storage", "node_modules"

# Default value for default_env is {}
# set :default_env, { path: "/opt/ruby/bin:$PATH" }

# Default value for local_user is ENV['USER']
# set :local_user, -> { `git config user.name`.chomp }

# Default value for keep_releases is 5
set :keep_releases, 5

# Uncomment the following to require manually verifying the host key before first deploy.
# set :ssh_options, verify_host_key: :secure

set :pm2_roles, :app
set :pm2_process_file, "ecosystem.config.js"

namespace :bun do
    task :install do
        on roles(:app) do
            within releases_path do
                execute :bun, "install"
            end
        end
    end
end
namespace :bun do
    task :migrate do
        on roles(:app) do
            within releases_path do
                execute :bun, "run", "migrate"
            end
        end
    end
end
namespace :pm2 do
    task :restart do
        on roles(:app) do
            within releases_path do
                execute :pm2, "reload", "porto-api", "||", "pm2", "start", "bun", "--name", "porto-api", "--", "run", "start"
            end
        end
    end
end

after "deploy:updated", "bun:install"
after "bun:install", "bun:migrate"
after "bun:migrate", "pm2:restart"