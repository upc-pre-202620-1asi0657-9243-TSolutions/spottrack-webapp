workspace "SpotTrack – Analytics" "C4 Component Diagram for the Analytics Bounded Context" {

    model {
        properties {
            structurizr.groupSeparator "/"
        }

        restApi = softwareSystem "SpotTrack REST API" "Backend JSON API over HTTPS" "External System"

        spottrack = softwareSystem "SpotTrack Frontend" {

            analyticsBC = container "Analytics Bounded Context" "Usage analytics, financial impact, relocation recommendations and ROI projection" "Angular 18" {

                group "Presentation" {
                    group "Views" {
                        analyticsComp = component "Analytics" "Multi-section dashboard: usage KPIs, weekly/hourly SVG charts, relocation table, financial impact cards, maintenance cost pie chart and reactive ROI simulator with CSV/PDF export." "Angular Component" "Presentation"
                    }
                }

                group "Application" {
                    appLayer = component "Application" "AnalyticsStore: signal state with computed stats, weeklyData, hourlyData, relocationData and maxCapacity." "Angular Injectable" "Application"
                }

                group "Domain" {
                    domainLayer = component "Domain" "AnalyticsStat Entity: equipmentId, usageHours, occupancyRate, peakHour, inactiveHours, period." "TypeScript Class" "Domain"
                }

                group "Infrastructure" {
                    infraLayer = component "Infrastructure" "AnalyticsApi, AnalyticsResponse (EquipmentUsageStatResource, EquipmentResource)" "TypeScript Classes" "Infrastructure"
                }
            }
        }

        analyticsComp -> appLayer "reads stats, chart data and relocation signals"
        appLayer -> domainLayer "manages AnalyticsStat entities"
        appLayer -> infraLayer "calls getUsageStats(), getEquipments()"
        infraLayer -> restApi "GET /equipment-usage-stats, GET /equipments" "JSON / HTTPS"
    }

    views {
        component analyticsBC "03e_Analytics" "Analytics Bounded Context – C4 Component" {
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
