# NetDraw diagram syntax — reference

Upload this file as the agent's knowledge/reference document. It lists
exactly what the NetDraw renderer understands.

## Device types and the words that select them

NetDraw infers a device's icon from the node's ID and label. These are the
48 available icons and the words that trigger them.

| Icon type | Recognised words in the ID or label |
|---|---|
| `router` | router, ASR, ISR, CSR; ID tokens `rt`, `rtr`, `rw` |
| `l3switch` | layer 3 switch, L3 switch |
| `switch` | switch, Nexus, Catalyst, leaf, spine; ID tokens `sw`, `swg`, `sc` |
| `hub` | hub |
| `firewall` | firewall, FTD, Firepower, ASA, Palo Alto, PA-xxxx, FortiGate, Fortinet, Check Point, NGFW, SRX; ID token `fw` |
| `loadbalancer` | load balancer, LB, F5, NetScaler, BIG-IP; ID token `lb` |
| `proxy` | proxy |
| `vpn` | VPN, VPN gateway |
| `ids` | IDS, IPS, intrusion |
| `gateway` | gateway; ID token `gw` |
| `aci` | ACI, ACI fabric, spine-leaf |
| `modem` | modem |
| `internet` | internet, WAN |
| `cloud` | cloud, AWS, Azure, GCP |
| `privatecloud` | private cloud |
| `cdn` | CDN, content delivery |
| `dns` | DNS, name server |
| `datacenter` | data center, datacentre |
| `server` | server, host, UCS; ID token `srv` |
| `webserver` | web server |
| `mailserver` | mail server, Exchange server, SMTP |
| `database` | database, DB; ID token `db` |
| `storage` | storage, NAS; ID token `nas` |
| `san` | SAN, SAN fabric |
| `backup` | backup, tape |
| `mainframe` | mainframe |
| `vm` | virtual machine, VM |
| `container` | container, Docker, pod |
| `cluster` | cluster, Kubernetes, K8s |
| `wifi` | access point, Wi-Fi, wireless, AP; ID token `ap` |
| `wlc` | wireless controller, WLC |
| `celltower` | cell tower, antenna, 4G, 5G, LTE |
| `satellite` | satellite, VSAT, dish |
| `workstation` | workstation, desktop, PC, computer |
| `laptop` | laptop, notebook |
| `tablet` | tablet, iPad |
| `mobile` | mobile, smartphone, iPhone, Android |
| `phone` | phone, VoIP |
| `printer` | printer |
| `scanner` | scanner |
| `camera` | camera, IP camera, CCTV |
| `tv` | display, screen, monitor, TV |
| `pos` | POS, point of sale, terminal |
| `iot` | IoT, sensor, thermostat |
| `user` | user, client, employee |
| `usergroup` | user group, team, department |
| `admin` | admin, administrator |
| `shield` | shield, security |

Anything unrecognised becomes a generic server icon, which the user can
change in one click with the Device type dropdown in NetDraw.

## Supported Mermaid constructs

| Construct | Example | Result |
|---|---|---|
| Header | `flowchart TD`, `flowchart LR` | ignored (direction is set in NetDraw) |
| Node with label | `SW1[Core Switch]` | node labelled "Core Switch" |
| Detail line | `SW1[Core Switch<br/>10.0.0.1]` | small grey second line |
| Shapes | `A(..)`, `A((..))`, `A[(..)]`, `A{..}`, `A{{..}}`, `A[[..]]` | accepted; `[( )]` implies a database, `(( ))` a cloud |
| Plain link | `A --> B` | solid line |
| Labelled link | `A -->\|"Gi1/0/1"\| B` | solid line with label |
| Alternate label form | `A -- Gi1/0/1 --> B` | same |
| Dotted link | `A -.-> B` | dashed line (logical/protocol) |
| Thick link | `A ==> B` | solid line |
| Chain | `A --> B --> C` | two links |
| Fan-out | `A --> B & C` | two links |
| Subgraph | `subgraph DMZ` … `end` | labelled zone box around those devices |
| Comment | `%% text` | ignored |
| Styling | `classDef`, `class`, `style`, `linkStyle`, `click` | ignored, not drawn |

Reverse duplicates (`A --> B` and `B --> A`) collapse into a single line.

## Limits

Up to 200 devices and 400 links per diagram. Labels are truncated at 40
characters. NetDraw lays the graph out automatically — node positions in
the source are not needed and are ignored.
