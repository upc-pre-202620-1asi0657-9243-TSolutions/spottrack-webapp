workspace "SpotTrack – Dashboard" "C4 Component Diagram for the Dashboard Bounded Context" {

    model {
        properties {
            structurizr.groupSeparator "/"
        }

        restApi = softwareSystem "SpotTrack REST API" "Backend JSON API over HTTPS" "External System"

        spottrack = softwareSystem "SpotTrack Frontend" {

            dashboardBC = container "Dashboard Bounded Context" "Home overview: KPIs, usage charts and maintenance ticket snapshot" "Angular 18" {

                group "Presentation" {
                    group "Views" {
                        dashboardComp = component "Dashboard" "Admin home with KPI cards, SVG occupancy line chart, SVG per-equipment usage bar chart and a recent maintenance tickets panel with ROI badges." "Angular Component" "Presentation"
                    }
                }

                group "Application" {
                    appLayer = component "Application" "DashboardStore: signal state with computed KPIs, SVG chart points, bar-chart dataset and latest ticket list." "Angular Injectable" "Application"
                }

                group "Domain" {
                    domainLayer = component "Domain" "EquipmentUsageStat Entity: id, equipmentId, equipmentName, usageHours, occupancyRate, period." "TypeScript Class" "Domain"
                }

                group "Infrastructure" {
                    infraLayer = component "Infrastructure" "DashboardApi, EquipmentUsageStatApiEndpoint (/equipment-usage-stats), EquipmentUsageStatAssembler, DashboardResponse" "TypeScript Classes" "Infrastructure"
                }
            }
        }

        dashboardComp -> appLayer "reads KPI signals, chart data and ticket list"
        appLayer -> domainLayer "manages EquipmentUsageStat entities"
        appLayer -> infraLayer "calls getEquipmentUsageStats(), getUsageSessions()"
        infraLayer -> restApi "GET /equipment-usage-stats, GET /usage_sessions" "JSON / HTTPS"
    }

    views {
        component dashboardBC "03f_Dashboard" "Dashboard Bounded Context – C4 Component" {
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
