workspace "SpotTrack – SPA Component Overview" "C4 Component Diagram – all bounded contexts inside the SPA container" {

    model {
        adminUser  = person "Gym Administrator" "Manages equipment, maintenance, IoT and analytics." "Admin"
        clientUser = person "Gym Client"        "Books equipment, views map and manages routines."   "Client"
        restApi    = softwareSystem "SpotTrack REST API" "Backend JSON API over HTTPS." "External System"

        spottrack = softwareSystem "SpotTrack Frontend" {

            spa = container "Single Page Application" "Angular 18 SPA deployed on Azure Static Web Apps." "Angular 18 / TypeScript" {

                shared        = component "Shared"          "Auth, route guards, layout shell, base HTTP infrastructure and session management." "Angular" "Presentation"
                dashboard     = component "Dashboard"       "Admin KPI overview: occupancy charts, usage stats and maintenance ticket snapshot."  "Angular" "Presentation"
                equipment     = component "Equipment"       "Gym equipment catalog: list, create, edit and delete."                               "Angular" "Presentation"
                iot           = component "IoT"             "Real-time IoT sensor monitoring: status, battery, signal and alert management."       "Angular" "Presentation"
                maintenance   = component "Maintenance"     "Kanban ticket workflow and preventive schedule management."                           "Angular" "Presentation"
                analytics     = component "Analytics"       "Usage analytics, relocation recommendations and ROI simulator."                       "Angular" "Presentation"
                financialImpact = component "Financial Impact" "Revenue loss, maintenance cost and ROI projection dashboards."                    "Angular" "Presentation"
                configuration = component "Configuration"   "System-wide settings: thresholds, IoT params, notifications and financial config."    "Angular" "Presentation"
                alerts        = component "Alerts"          "Notification feed for admin and client events; dismiss and navigate actions."          "Angular" "Presentation"
                client        = component "Client"          "Client home page with active booking countdown and quick-links."                       "Angular" "Presentation"
                map           = component "Map"             "Interactive SVG facility map with colour-coded equipment-status pins."                 "Angular" "Presentation"
                reservation   = component "Reservation"     "Equipment booking: create timed reservations and manage active bookings."              "Angular" "Presentation"
                routines      = component "Routines"        "Personal workout routine builder: create, edit and delete routines and exercises."     "Angular" "Presentation"
            }
        }

        adminUser  -> shared    "Logs in and navigates admin views"
        clientUser -> shared    "Logs in and navigates client views"

        shared -> dashboard       "Routes admin to /dashboard"
        shared -> equipment       "Routes admin to /equipment"
        shared -> iot             "Routes admin to /iot"
        shared -> maintenance     "Routes admin to /maintenance"
        shared -> analytics       "Routes admin to /analytics"
        shared -> financialImpact "Routes admin to /financial-impact"
        shared -> configuration   "Routes admin to /configuration"
        shared -> alerts          "Routes any user to /alerts"
        shared -> client          "Routes client to /client"
        shared -> map             "Routes client to /map"
        shared -> reservation     "Routes client to /bookings"
        shared -> routines        "Routes client to /routines"

        dashboard       -> restApi "GET /equipment-usage-stats, /usage-sessions"           "JSON / HTTPS"
        equipment       -> restApi "GET / POST / PUT / DELETE /equipments"                 "JSON / HTTPS"
        iot             -> restApi "GET /iot-devices, PUT /iot-devices/:id"                "JSON / HTTPS"
        maintenance     -> restApi "GET / POST / PUT / DELETE /maintenance-tickets, /maintenance-schedules" "JSON / HTTPS"
        analytics       -> restApi "GET /equipment-usage-stats, GET /equipments"           "JSON / HTTPS"
        financialImpact -> restApi "GET /financial-stats, GET /equipment-usage-stats"      "JSON / HTTPS"
        configuration   -> restApi "GET /configurations, PUT /configurations/:id"          "JSON / HTTPS"
        alerts          -> restApi "GET /alerts, POST /alerts/:id/dismiss"                 "JSON / HTTPS"
        map             -> restApi "GET /equipments, GET /zones"                           "JSON / HTTPS"
        reservation     -> restApi "GET / POST / DELETE /reservations, GET /equipments"   "JSON / HTTPS"
        routines        -> restApi "GET / POST / PUT / DELETE /routines, GET /exercises"  "JSON / HTTPS"
    }

    views {
        component spa "03_SPA-Overview" "SpotTrack SPA – C4 Component Overview" {
            include *
            autolayout tb
        }

        styles {
            element "Admin" {
                shape "Person"
                background "#1e3a5f"
                color "#e2e8f0"
            }
            element "Client" {
                shape "Person"
                background "#14532d"
                color "#e2e8f0"
            }
            element "Presentation" {
                background "#1e3a8a"
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
