workspace "SpotTrack – IoT" "C4 Component Diagram for the IoT Bounded Context" {

    model {
        properties {
            structurizr.groupSeparator "/"
        }

        restApi = softwareSystem "SpotTrack REST API" "Backend JSON API over HTTPS" "External System"

        spottrack = softwareSystem "SpotTrack Frontend" {

            iotBC = container "IoT Bounded Context" "Real-time monitoring of IoT sensor devices attached to gym equipment" "Angular 18" {

                group "Presentation" {
                    group "Views" {
                        iotMonitoringComp = component "IotMonitoring" "Sensor dashboard with KPI cards (online/offline/battery/alerts), filterable device table, per-row investigate and replace actions, and a reconnect modal." "Angular Component" "Presentation"
                    }
                }

                group "Application" {
                    appLayer = component "Application" "IotStore: signal state with device list, computed counts and actions: refresh(), investigateAlert(), scheduleReplacement(), dismissReconnectedModal()." "Angular Injectable" "Application"
                }

                group "Domain" {
                    domainLayer = component "Domain" "Iot Entity: id, equipmentId, location, status, lastHeartbeat, batteryLevel, signalStrength, firmwareVersion." "TypeScript Class" "Domain"
                }

                group "Infrastructure" {
                    infraLayer = component "Infrastructure" "IotApi, IotApiEndpoint (/iot-devices), IotAssembler, IotResponse" "TypeScript Classes" "Infrastructure"
                }
            }
        }

        iotMonitoringComp -> appLayer "reads device signals; calls refresh(), investigateAlert(), scheduleReplacement(), dismissReconnectedModal()"
        appLayer -> domainLayer "manages Iot entities"
        appLayer -> infraLayer "calls getDevices(), updateDevice()"
        infraLayer -> restApi "GET /iot-devices, PUT /iot-devices/:id" "JSON / HTTPS"
    }

    views {
        component iotBC "03c_IoT" "IoT Bounded Context – C4 Component" {
            include *
            autolayout tb
        }

        styles {
            element "Presentation" {
                background "#1e3a8a"
                color "#ffffff"
                shape "Component"
            }
            element "Application" {
                background "#4c1d95"
                color "#ffffff"
                shape "Component"
            }
            element "Domain" {
                background "#78350f"
                color "#ffffff"
                shape "Component"
            }
            element "Infrastructure" {
                background "#064e3b"
                color "#ffffff"
                shape "Component"
            }
            element "External System" {
                background "#1f2937"
                color "#9ca3af"
                shape "RoundedBox"
            }
            element "Software System" {
                background "#111827"
                color "#e5e7eb"
            }
            element "Container" {
                background "#0f172a"
                color "#e2e8f0"
            }
        }
    }
}
