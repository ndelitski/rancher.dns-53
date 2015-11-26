# rancher.dns-53

L7 LB and External DNS in one service. Register rancher services in Route53 and balance services by cname's using Haproxy on 80 port.

## Differences with official `external-dns` package
 - Services are picked if special label is presented `io.rancher.route53: 'true'` and `ports: - your_port`
 - Haproxy is binded to 80 port with routing based on service cname's. Service port is picked from `ports` section. So you can simply access any service in environment with 80 port


