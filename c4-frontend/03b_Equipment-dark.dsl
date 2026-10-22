workspace "SpotTrack – Equipment" "C4 Component Diagram for the Equipment Bounded Context" {

    model {
        properties {
            structurizr.groupSeparator "/"
        }

        restApi = softwareSystem "SpotTrack REST API" "Backend JSON API over HTTPS" "External System"

        spottrack = softwareSystem "SpotTrack Frontend" {

            equipmentBC = container "Equipment Bounded Context" "Manages the gym equipment catalog" "Angular 18" {

                group "Presentation" {
                    group "Views" {
                        equipmentMgmtComp = component "EquipmentManagement" "Data-table of all equipment with text search, status filter and KPI counters; supports edit and delete per row." "Angular Component" "Presentation"
                        addEquipmentComp = component "AddEquipmentDialog" "Reactive form for creating or editing equipment; auto-detects create/edit mode via ActivatedRoute." "Angular Component" "Presentation"
                    }
                }

                group "Application" {
                    appLayer = component "Application" "EquipmentStore: signal state with equipment list, loading flag and computed status counts." "Angular Injectable" "Application"
                }

                group "Domain" {
                    domainLayer = component "Domain" "Equipment Entity: id, name, brand, model, zoneId, purchasePrice, status." "TypeScript Class" "Domain"
                }

                group "Infrastructure" {
                    infraLayer = component "Infrastructure" "EquipmentApi, EquipmentApiEndpoint (/equipments), EquipmentAssembler, EquipmentResponse" "TypeScript Classes" "Infrastructure"
                }
            }
        }

        equipmentMgmtComp -> appLayer "reads equipment list and counts; calls deleteEquipment()"
        addEquipmentComp -> appLayer "calls addEquipment() or updateEquipment()"
        appLayer -> domainLayer "manages Equipment entities"
        appLayer -> infraLayer "calls CRUD operations"
        infraLayer -> restApi "GET / POST / PUT / DELETE /equipments" "JSON / HTTPS"
    }

    views {
        component equipmentBC "03b_Equipment" "Equipment Bounded Context – C4 Component" {
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
