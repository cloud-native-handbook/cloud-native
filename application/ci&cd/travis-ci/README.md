# Travis CI

## 详解 `.travis.yml`

`.travis.yml` 文件意在告诉 Travis CI，项目在构建时所需的语言环境、运行的服务、以及执行的指令。

### sudo

```yaml
sudo: required
```

### language

虽然可以使用 `apt-get` 来安装所需的语言环境，但最简便的做法还是使用 `language` 参数。如果没有设置 `language`，其默认的语言环境是 `ruby`。

```yaml
# 安装 Python 2.7 和 Python 3.5 环境
language: python
python:
- 2.7
- 3.5
```

Travis CI 支持的语言环境：

* python
* ruby
* node.js

### services

`services` 参数会通知 Travis CI 该项目需要安装和启动的服务。例如，构建 Docker 镜像需要安装 Docker 环境以及启动 Docker 服务，可以直接在 `services` 参数列表下指定 `docker` 选项即可。

```yaml
# 安装 docker 和 redis-server 并启动相应服务
services:
  - docker
  - redis-server
```

### install

`install` 参数可以用于执行构建操作。如果 `install` 步骤执行失败（命令返回码为非 `0`），构建任务将在该步骤停止，不会继续执行后面的步骤，原因是安装步骤失败了构建无论如何也可能成功。

```yaml
install:
  - docker build -t Dockerfile .
  - docker run --name blog -p 8000:80 -d blog:latest
```

### script

`script` 参数可以用于测试构建结果。该参数是必须的，省略会导致构建失败。如果 `script` 步骤执行失败，构建任务会继续往后执行，原因是单个测试用例失败只会导致部分功能失败。

```yaml
script:
  - docker ps | grep -q blog
```

### before_script

`before_script` 步骤在 `script` 步骤之前、`install` 步骤之后执行，测试构建前必须要执行的步骤，如果 `before_script` 步骤失败了构建也会失败。例如，测试构建前需要安装一些 Python 依赖：

```yaml
before_script:
  - pip install -r requirements.txt
  - pip install mock
  - pip install requests
```

### after_script

### after_success

### env

* [Default Environment Variables](https://docs.travis-ci.com/user/environment-variables/#Default-Environment-Variables)

## Examples

## 参考

* [Using Docker in Builds](https://docs.travis-ci.com/user/docker/)
* [Using Travis CI to test Docker builds](http://bencane.com/2016/01/11/using-travis-ci-to-test-docker-builds/)
* [从 0 到 1：搭建基于 Travis CI 和 GitHub 的自动化测试工作流](http://dockone.io/article/962)
