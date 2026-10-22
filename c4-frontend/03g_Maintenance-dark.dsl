workspace "SpotTrack – Maintenance" "C4 Component Diagram for the Maintenance Bounded Context" {

    model {
        properties {
            structurizr.groupSeparator "/"
        }

        restApi = softwareSystem "SpotTrack REST API" "Backend JSON API over HTTPS" "External System"

        spottrack = softwareSystem "SpotTrack Frontend" {

            maintenanceBC = container "Maintenance Bounded Context" "Tracks maintenance tickets and preventive schedules via a Kanban workflow" "Angular 18" {

                group "Presentation" {
                    group "Views" {
                        maintenanceComp = component "Maintenance" "Kanban board with Open / In Progress / Resolved swimlanes; supports text search, status and priority filters, and Start / Complete ticket actions." "Angular Component" "Presentation"
                        newTicketComp = component "NewTicket" "Form view to create a maintenance ticket or schedule a preventive block; includes peak-hour detection and suggested off-peak time slots." "Angular Component" "Presentation"
                    }
                }

                group "Application" {
                    appLayer = component "Application" "MaintenanceStore: signal state with ticket and schedule lists; actions: createTicket(), startTicket(), completeTicket(); utility: isPeakHour()." "Angular Injectable" "Application"
                }

                group "Domain" {
                    domainLayer = component "Domain" "MaintenanceTicket Entity: id, equipmentId, description, priority, type, status, createdAt. MaintenanceSchedule Entity: id, equipmentId, scheduledDate, intervalDays." "TypeScript Classes" "Domain"
                }

                group "Infrastructure" {
                    infraLayer = component "Infrastructure" "MaintenanceApi, MaintenanceTicketApiEndpoint (/maintenance-tickets), MaintenanceScheduleApiEndpoint (/maintenance-schedules), Assemblers, Response interfaces" "TypeScript Classes" "Infrastructure"
                }
            }
        }

        maintenanceComp -> appLayer "reads ticket signals; calls startTicket(), completeTicket()"
        newTicketComp -> appLayer "calls createTicket(), scheduleBlock(), isPeakHour(); reads suggestedTimes"
        appLayer -> domainLayer "manages Ticket and Schedule entities"
        appLayer -> infraLayer "calls getTickets(), createTicket(), updateTicket(), getSchedules()"
        infraLayer -> restApi "GET / POST / PUT / DELETE /maintenance-tickets, /maintenance-schedules" "JSON / HTTPS"
    }

    views {
        component maintenanceBC "03g_Maintenance" "Maintenance Bounded Context – C4 Component" {
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
