workspace "SpotTrack – Alerts" "C4 Component Diagram for the Alerts Bounded Context" {

    model {
        properties {
            structurizr.groupSeparator "/"
        }

        spottrack = softwareSystem "SpotTrack Frontend" {

            alertsBC = container "Alerts Bounded Context" "Displays system, admin and client notifications and routes users to the relevant section" "Angular 18" {

                group "Presentation" {
                    group "Views" {
                        alertsComp = component "Alerts" "Notification feed with type-coded cards (admin | client | system), relative timestamps, click-to-navigate and per-alert dismiss action." "Angular Component" "Presentation"
                    }
                }

                group "Domain" {
                    domainLayer = component "Domain" "Alert Interface: id, title, description, type, icon, date, targetRoute." "TypeScript Interface" "Domain"
                }
            }
        }

        alertsComp -> domainLayer "renders Alert instances"
    }

    views {
        component alertsBC "03d_Alerts" "Alerts Bounded Context – C4 Component" {
            include *
            autolayout tb
        }

        styles {
            element "Presentation" {
                background "#1e3a8a"
                color "#ffffff"
                shape "Component"
            }
            element "Domain" {
                background "#78350f"
                color "#ffffff"
                shape "Component"
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
