workspace "SpotTrack – Reservation" "C4 Component Diagram for the Reservation Bounded Context" {

    model {
        properties {
            structurizr.groupSeparator "/"
        }

        spottrack = softwareSystem "SpotTrack Frontend" {

            reservationBC = container "Reservation Bounded Context" "Allows clients to reserve gym machines for timed sessions" "Angular 18" {

                group "Presentation" {
                    group "Views" {
                        bookingComp = component "Booking" "Shows active bookings as countdown cards with Cancel action; floating button opens a machine-selection modal with zone, icon and duration (10/15/20 min) to create a new reservation." "Angular Component" "Presentation"
                    }
                }

                group "Domain" {
                    domainLayer = component "Domain" "Booking Interface: id, machineKey, zoneKey, icon, timerSeconds. AvailableMachine Interface: key, zoneKey, icon." "TypeScript Interfaces" "Domain"
                }
            }
        }

        bookingComp -> domainLayer "renders Booking and AvailableMachine instances"
    }

    views {
        component reservationBC "03i_Reservation" "Reservation Bounded Context – C4 Component" {
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
