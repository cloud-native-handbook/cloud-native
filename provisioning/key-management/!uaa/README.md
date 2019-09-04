# UAA

## 快速开始

### 本地部署

```bash
$ git clone git://github.com/cloudfoundry/uaa.git

# 构建和运行所有组件，包括 UAA 和示例程序（uaa、samples/api、samples/app）
$ cd uaa && ./gradlew run

# Tomcat 会在 8080 端口启动三个应用
# http://localhost:8080/uaa
# http://localhost:8080/app
# http://localhost:8080/api
```

### 使用本地 UAA

* 查询系统登录后端

```bash
$ curl -H "Accept: application/json" localhost:8080/uaa/login | jq .
{
  "timestamp": "2018-03-13T05:45:01+0800",
  "prompts": {
    "password": [
      "password",
      "Password"
    ],
    "username": [
      "text",
      "Email"
    ]
  },
  "idpDefinitions": {},
  "commit_id": "36e3fdf",
  "entityID": "cloudfoundry-saml-login",
  "zone_name": "uaa",
  "links": {
    "register": "/create_account",
    "login": "http://localhost:8080/uaa",
    "passwd": "/forgot_password",
    "uaa": "http://localhost:8080/uaa"
  },
  "app": {
    "version": "4.11.0"
  }
}
```

* 安装 UAA 命令行客户端 UAAC

```bash
$ gem install cf-uaac
```

* 定位到 UAA 服务后端

```bash
$ uaac target http://localhost:8080/uaa
```

* 登录

```bash
$ uaac token get <USERNAME> <PASSWORD>
```

### 集成测试

```bash
$ ./gradlew integrationTest
```


### 



https://github.com/cloudfoundry/uaa


uaa_endpoint = uaa.mydomain.org
uaa_clientid= id
uaa_clientsecret= secret
uaa_ca_root= /path/to/uaa_ca.pem



https://github.com/frodenas/uaa-k8s-oidc-helper