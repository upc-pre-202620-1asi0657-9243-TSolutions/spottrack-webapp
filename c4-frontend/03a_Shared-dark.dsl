workspace "SpotTrack – Shared" "C4 Component Diagram for the Shared Bounded Context" {

    model {
        properties {
            structurizr.groupSeparator "/"
        }

        restApi = softwareSystem "SpotTrack REST API" "Backend JSON API over HTTPS" "External System"

        spottrack = softwareSystem "SpotTrack Frontend" {

            sharedBC = container "Shared Bounded Context" "Cross-cutting shell, base infrastructure and authentication" "Angular 18" {

                group "Presentation" {
                    group "Components" {
                        layoutComp = component "Layout" "Main app shell; composes Sidebar, BottomBar, LanguageSwitcher and UserProfile; toggles admin/client nav via AuthStore." "Angular Component" "Presentation"
                        sidebarComp = component "Sidebar" "Role-aware vertical nav; renders ADMIN_NAV or CLIENT_NAV based on role @Input." "Angular Component" "Presentation"
                        bottomBarComp = component "BottomBar" "Mobile horizontal nav bar; mirrors sidebar links." "Angular Component" "Presentation"
                        languageSwitcherComp = component "LanguageSwitcher" "Dropdown to switch between Español and English via ngx-translate." "Angular Component" "Presentation"
                        userProfileComp = component "UserProfile" "Header link that navigates to the profile page." "Angular Component" "Presentation"
                        loginComp = component "Login" "Email/password form; delegates auth to AuthStore and redirects to /dashboard." "Angular Component" "Presentation"
                        profileViewComp = component "ProfileView" "Read-only profile page with embedded LanguageSwitcher." "Angular Component" "Presentation"
                    }
                }

                group "Application" {
                    appLayer = component "Application" "AuthStore, SessionService, BaseStore" "Angular Injectables" "Application"
                }

                group "Domain" {
                    domainLayer = component "Domain" "User Model, BaseEntity" "TypeScript Interfaces / Classes" "Domain"
                }

                group "Infrastructure" {
                    infraLayer = component "Infrastructure" "AuthGuard, BaseApi, BaseApiEndpoint, BaseAssembler, BaseResponse" "TypeScript Classes" "Infrastructure"
                }
            }
        }

        layoutComp -> sidebarComp "renders, passes role"
        layoutComp -> bottomBarComp "renders"
        layoutComp -> languageSwitcherComp "renders"
        layoutComp -> userProfileComp "renders"
        layoutComp -> appLayer "reads role, calls logout()"
        sidebarComp -> appLayer "reads role"
        loginComp -> appLayer "calls login()"
        appLayer -> domainLayer "holds current user"
        infraLayer -> appLayer "guards routes via AuthStore"
        infraLayer -> restApi "HTTP GET / POST / PUT / DELETE" "JSON / HTTPS"
    }

    views {
        component sharedBC "03a_Shared" "Shared Bounded Context – C4 Component" {
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
