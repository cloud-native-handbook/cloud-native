#!/usr/bin/env python3
# coding: utf-8

import sys
import socket
from kafka import KafkaProducer


def send_message_to_kafka(bootstrap_servers, topic, str_message):
    producer = KafkaProducer(bootstrap_servers=bootstrap_servers)
    # 将消息转换为 bytes 类型发送
    future = producer.send(topic, value=str.encode(str_message))
    future.get(timeout=60)


def start_socket_server(server_port, kafka_bootstrap_servers, topic):
    server_address = ('0.0.0.0', server_port)
    socket_server = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    socket_server.bind(server_address)
    while True:
        bytes_data, client_address = socket_server.recvfrom(2048)
        # 移除换行符
        message = str(bytes_data, encoding='utf-8').replace('\n', '')
        print(kafka_bootstrap_servers, topic, message)
        # 发送消息到 kafka
        send_message_to_kafka(kafka_bootstrap_servers, topic, message)


def main():
    # 参数分别表示： socket server 端口，kafka broker list，kafka topic
    server_port, kafka_bootstrap_servers, topic_name = sys.argv[1], sys.argv[2], sys.argv[3]
    start_socket_server(int(server_port), str(kafka_bootstrap_servers), str(topic_name))


if __name__ == "__main__":
    main()
