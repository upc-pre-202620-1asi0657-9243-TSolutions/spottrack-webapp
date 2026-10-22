workspace "SpotTrack – Configuration" "C4 Component Diagram for the Configuration Bounded Context" {

    model {
        properties {
            structurizr.groupSeparator "/"
        }

        restApi = softwareSystem "SpotTrack REST API" "Backend JSON API over HTTPS" "External System"

        spottrack = softwareSystem "SpotTrack Frontend" {

            configBC = container "Configuration Bounded Context" "System-wide settings: maintenance thresholds, IoT parameters, notifications and financial config" "Angular 18" {

                group "Presentation" {
                    group "Views" {
                        configComp = component "Configuration" "Settings form with four sections: maintenance thresholds (sliders), IoT config, notification toggles per alert type, and financial parameters; Save/Cancel via MatSnackBar." "Angular Component" "Presentation"
                    }
                }

                group "Application" {
                    appLayer = component "Application" "ConfigurationStore: loads settings on init, exposes save(config) to persist changes." "Angular Injectable" "Application"
                }

                group "Domain" {
                    domainLayer = component "Domain" "Configuration Entity: maintenanceThresholds, iotConfig, notifications, financialConfig. AlertType Interface: key, name, description, enabled." "TypeScript Classes" "Domain"
                }

                group "Infrastructure" {
                    infraLayer = component "Infrastructure" "ConfigurationApiEndpoint (/configurations), ConfigurationAssembler" "TypeScript Classes" "Infrastructure"
                }
            }
        }

        configComp -> appLayer "reads settings; calls save()"
        appLayer -> domainLayer "manages Configuration and AlertType instances"
        appLayer -> infraLayer "calls getAll(), update()"
        infraLayer -> restApi "GET /configurations, PUT /configurations/:id" "JSON / HTTPS"
    }

    views {
        component configBC "03h_Configuration" "Configuration Bounded Context – C4 Component" {
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
