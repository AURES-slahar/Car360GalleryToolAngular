'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">Car360GalleryToolAngular Documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                        <li class="link">
                            <a href="overview.html" data-type="chapter-link">
                                <span class="icon ion-ios-keypad"></span>Overview
                            </a>
                        </li>
                        <li class="link">
                            <a href="index.html" data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>README
                            </a>
                        </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>
                    </ul>
                </li>
                    <li class="chapter modules">
                        <a data-type="chapter-link" href="modules.html">
                            <div class="menu-toggler linked" data-bs-toggle="collapse" ${ isNormalMode ?
                                'data-bs-target="#modules-links"' : 'data-bs-target="#xs-modules-links"' }>
                                <span class="icon ion-ios-archive"></span>
                                <span class="link-name">Modules</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                        </a>
                        <ul class="links collapse " ${ isNormalMode ? 'id="modules-links"' : 'id="xs-modules-links"' }>
                            <li class="link">
                                <a href="modules/AppModule.html" data-type="entity-link" >AppModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#components-links-module-AppModule-224f4ad529813b9c54de1a528fdaf7f493e0a53681258f501e211a4582ae736a9fcb78b31a1ac44b5c4d2b9a784bf58e5590085c3194bc5a2f39bb5bd2caff5b"' : 'data-bs-target="#xs-components-links-module-AppModule-224f4ad529813b9c54de1a528fdaf7f493e0a53681258f501e211a4582ae736a9fcb78b31a1ac44b5c4d2b9a784bf58e5590085c3194bc5a2f39bb5bd2caff5b"' }>
                                            <span class="icon ion-md-cog"></span>
                                            <span>Components</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="components-links-module-AppModule-224f4ad529813b9c54de1a528fdaf7f493e0a53681258f501e211a4582ae736a9fcb78b31a1ac44b5c4d2b9a784bf58e5590085c3194bc5a2f39bb5bd2caff5b"' :
                                            'id="xs-components-links-module-AppModule-224f4ad529813b9c54de1a528fdaf7f493e0a53681258f501e211a4582ae736a9fcb78b31a1ac44b5c4d2b9a784bf58e5590085c3194bc5a2f39bb5bd2caff5b"' }>
                                            <li class="link">
                                                <a href="components/AppComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AppComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/CloseComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >CloseComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/ControlsButtonComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ControlsButtonComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/ControlsComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ControlsComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/CursorComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >CursorComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/HomepagePage.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >HomepagePage</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/InfoMessageComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >InfoMessageComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/LoaderComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >LoaderComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/MainComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >MainComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/PageComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >PageComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/PreloadComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >PreloadComponent</a>
                                            </li>
                                        </ul>
                                    </li>
                            </li>
                </ul>
                </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#classes-links"' :
                            'data-bs-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>Classes</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/AppPage.html" data-type="entity-link" >AppPage</a>
                            </li>
                            <li class="link">
                                <a href="classes/CancellableImageLoader.html" data-type="entity-link" >CancellableImageLoader</a>
                            </li>
                            <li class="link">
                                <a href="classes/ExteriorControls.html" data-type="entity-link" >ExteriorControls</a>
                            </li>
                            <li class="link">
                                <a href="classes/ExteriorMapPlane.html" data-type="entity-link" >ExteriorMapPlane</a>
                            </li>
                            <li class="link">
                                <a href="classes/ExteriorMethod.html" data-type="entity-link" >ExteriorMethod</a>
                            </li>
                            <li class="link">
                                <a href="classes/InteriorControls.html" data-type="entity-link" >InteriorControls</a>
                            </li>
                            <li class="link">
                                <a href="classes/InteriorMapCube.html" data-type="entity-link" >InteriorMapCube</a>
                            </li>
                            <li class="link">
                                <a href="classes/InteriorMethod.html" data-type="entity-link" >InteriorMethod</a>
                            </li>
                            <li class="link">
                                <a href="classes/OrthographicTileMesh.html" data-type="entity-link" >OrthographicTileMesh</a>
                            </li>
                            <li class="link">
                                <a href="classes/PerspectiveTileMesh.html" data-type="entity-link" >PerspectiveTileMesh</a>
                            </li>
                            <li class="link">
                                <a href="classes/RenderFrustum.html" data-type="entity-link" >RenderFrustum</a>
                            </li>
                            <li class="link">
                                <a href="classes/RenderMethod.html" data-type="entity-link" >RenderMethod</a>
                            </li>
                            <li class="link">
                                <a href="classes/TileAbortError.html" data-type="entity-link" >TileAbortError</a>
                            </li>
                            <li class="link">
                                <a href="classes/TileLoader.html" data-type="entity-link" >TileLoader</a>
                            </li>
                            <li class="link">
                                <a href="classes/TileMesh.html" data-type="entity-link" >TileMesh</a>
                            </li>
                            <li class="link">
                                <a href="classes/TileTextureCache.html" data-type="entity-link" >TileTextureCache</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interfaces-links"' :
                            'data-bs-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/ClientDimensions.html" data-type="entity-link" >ClientDimensions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ExteriorTilePanorama.html" data-type="entity-link" >ExteriorTilePanorama</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/HandheldShape.html" data-type="entity-link" >HandheldShape</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/InteriorTilePanorama.html" data-type="entity-link" >InteriorTilePanorama</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/LazyPromise.html" data-type="entity-link" >LazyPromise</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Manifest.html" data-type="entity-link" >Manifest</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ManifestRenderer.html" data-type="entity-link" >ManifestRenderer</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RenderCallbacks.html" data-type="entity-link" >RenderCallbacks</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RenderOptions.html" data-type="entity-link" >RenderOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TileJob.html" data-type="entity-link" >TileJob</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TileOptions.html" data-type="entity-link" >TileOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TilePanorama.html" data-type="entity-link" >TilePanorama</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TilePosition.html" data-type="entity-link" >TilePosition</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TilePosition-1.html" data-type="entity-link" >TilePosition</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Transition.html" data-type="entity-link" >Transition</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TransitionViewport.html" data-type="entity-link" >TransitionViewport</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Viewport.html" data-type="entity-link" >Viewport</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/enumerations.html" data-type="entity-link">Enums</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/typealiases.html" data-type="entity-link">Type aliases</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <a data-type="chapter-link" href="routes.html"><span class="icon ion-ios-git-branch"></span>Routes</a>
                        </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});