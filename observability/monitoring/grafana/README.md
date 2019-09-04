# Grafana

## 安装、运行

```bash
# Docker 运行
$ docker run -d --name=grafana -p 3000:3000 grafana/grafana 
```

> http://docs.grafana.org/installation/

## 基本概念

### Data Source（数据源）

Grafana 支持的数据源：

* CloudWatch
* Elasticsearch
* Graphite
* InfluxDB
* MySQL（新版本）
* OpenTSDB
* Prometheus

### Organization（组织）

### User

### Row（行）

行是 Grafana 在仪表盘界面的逻辑分区器，用于将多个面板连接在一起。