#!/bin/bash

# OpenNebula Docker & Kubernetes Addon Installation Script
# This script automates the installation of Docker and Kubernetes (OneKE) addons for OpenNebula

set -e

echo "================================================"
echo "OpenNebula Docker & Kubernetes Setup"
echo "================================================"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running with sudo for system-level changes
check_sudo() {
    if [[ $EUID -ne 0 ]]; then
        log_warn "Some operations require sudo. You may be prompted for your password."
        return 1
    fi
    return 0
}

# Install Docker
install_docker() {
    log_info "Installing Docker..."
    
    if command -v docker &> /dev/null; then
        log_success "Docker is already installed: $(docker --version)"
        return 0
    fi
    
    # Detect OS
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
    else
        log_error "Cannot detect OS"
        return 1
    fi
    
    case $OS in
        ubuntu|debian)
            log_info "Installing Docker for $OS..."
            sudo apt update
            sudo apt install -y docker.io
            sudo systemctl enable docker
            sudo systemctl start docker
            log_success "Docker installed successfully"
            
            # Add current user to docker group
            if [ "$SUDO_USER" != "" ]; then
                sudo usermod -aG docker $SUDO_USER
                log_info "Added $SUDO_USER to docker group"
            fi
            ;;
        centos|rhel|fedora)
            log_info "Installing Docker for $OS..."
            sudo yum install -y docker
            sudo systemctl enable docker
            sudo systemctl start docker
            log_success "Docker installed successfully"
            ;;
        *)
            log_error "Unsupported OS: $OS"
            return 1
            ;;
    esac
}

# Install Kubernetes prerequisites
install_k8s_prerequisites() {
    log_info "Installing Kubernetes prerequisites..."
    
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
    fi
    
    case $OS in
        ubuntu|debian)
            log_info "Installing K8s prerequisites for $OS..."
            sudo apt update
            sudo apt install -y ruby ruby-dev build-essential curl wget git
            ;;
        centos|rhel|fedora)
            log_info "Installing K8s prerequisites for $OS..."
            sudo yum install -y ruby ruby-devel gcc make curl wget git
            ;;
    esac
    
    # Install Ruby gems (try system install, fallback to user-install if system RubyGems managed by APT)
    log_info "Installing Ruby gems..."

    # Preferred: install system-wide with sudo (may fail on APT-managed RubyGems)
    if sudo gem install bundler --no-document; then
        log_info "Installed bundler system-wide"
    else
        log_warn "System-wide bundler install failed; will install into user gem directory"
        gem install bundler --user-install --no-document || true
    fi

    # Install nokogiri (prefer system libraries)
    if sudo gem install nokogiri --no-document -- --use-system-libraries; then
        log_info "Installed nokogiri system-wide"
    else
        log_warn "System-wide nokogiri install failed; installing into user gem directory"
        gem install nokogiri --user-install --no-document -- --use-system-libraries || true
    fi

    # Install OpenNebula gems
    if sudo gem install opennebula opennebula-cli --no-document; then
        log_info "Installed OpenNebula gems system-wide"
    else
        log_warn "System-wide OpenNebula gem install failed; installing into user gem directory"
        gem install opennebula --user-install --no-document || true
        gem install opennebula-cli --user-install --no-document || true
    fi

    log_success "Kubernetes prerequisites installed (gems may be in user gem dir)"
}

# Download and install OneKE addon
install_oneke() {
    log_info "Installing OneKE (Kubernetes addon)..."
    
    ADDON_DIR="${ADDONS_DIR:-$HOME/.opennebula/addons}"
    mkdir -p "$ADDON_DIR"
    
    cd "$ADDON_DIR"
    
    # Clone OneKE repository
    if [ ! -d "oneke" ]; then
        log_info "Downloading OneKE from GitHub..."
        if ! GIT_TERMINAL_PROMPT=0 git -c credential.helper= clone https://github.com/OpenNebula/oneke.git oneke; then
            log_error "Could not clone OneKE from GitHub. This repository appears unavailable publicly or requires authentication."
            log_info "If you have access, please clone it manually into $ADDON_DIR/oneke."
            return 1
        fi
    else
        log_info "OneKE already downloaded, updating..."
        cd oneke && git pull && cd ..
    fi
    
    cd oneke
    
    # Check for install script
    if [ -f "install.sh" ]; then
        log_info "Running OneKE installer..."
        chmod +x install.sh
        sudo ./install.sh
    elif [ -f "Rakefile" ]; then
        log_info "Running OneKE rake installer..."
        sudo rake install
    else
        log_warn "No installer found in OneKE repository"
        log_info "Manual installation may be required"
        log_info "See: https://github.com/OpenNebula/oneke for details"
    fi
    
    log_success "OneKE installation complete"
}

# Download Docker Machine addon
install_docker_machine() {
    log_info "Installing Docker Machine addon..."
    
    ADDON_DIR="${ADDONS_DIR:-$HOME/.opennebula/addons}"
    mkdir -p "$ADDON_DIR"
    
    cd "$ADDON_DIR"
    
    # Clone Docker Machine addon repository
    if [ ! -d "addon-docker-machine" ]; then
        log_info "Downloading Docker Machine addon from GitHub..."
        if ! GIT_TERMINAL_PROMPT=0 git -c credential.helper= clone https://github.com/OpenNebula/docker-machine-opennebula.git addon-docker-machine; then
            log_error "Could not clone Docker Machine addon from GitHub. Please check network access or clone manually."
            return 1
        fi
    else
        log_info "Docker Machine addon already downloaded, updating..."
        cd addon-docker-machine && git pull && cd ..
    fi
    
    log_success "Docker Machine addon installed"
}

# Setup addon directory permissions
setup_addon_permissions() {
    log_info "Setting up addon directory permissions..."
    
    ADDON_DIR="${ADDONS_DIR:-$HOME/.opennebula/addons}"
    
    if [ ! -d "$ADDON_DIR" ]; then
        mkdir -p "$ADDON_DIR"
    fi
    
    # Set permissions
    chmod 755 "$ADDON_DIR"
    
    log_success "Addon directory ready: $ADDON_DIR"
}

# Verify installation
verify_installation() {
    log_info "Verifying installation..."
    
    echo ""
    echo "=== System Check ==="
    
    if command -v docker &> /dev/null; then
        log_success "Docker: $(docker --version)"
    else
        log_error "Docker: NOT INSTALLED"
    fi
    
    if command -v kubectl &> /dev/null; then
        log_success "Kubectl: $(kubectl version --client --short 2>/dev/null || echo 'installed')"
    else
        log_warn "Kubectl: Not yet installed (will be set up by OneKE)"
    fi
    
    if command -v ruby &> /dev/null; then
        log_success "Ruby: $(ruby --version)"
    else
        log_error "Ruby: NOT INSTALLED"
    fi
    
    ADDON_DIR="${ADDONS_DIR:-$HOME/.opennebula/addons}"
    if [ -d "$ADDON_DIR" ]; then
        log_success "Addon directory: $ADDON_DIR"
        if [ -d "$ADDON_DIR/oneke" ]; then
            log_success "  - OneKE addon: installed"
        else
            log_warn "  - OneKE addon: not installed"
        fi
        if [ -d "$ADDON_DIR/addon-docker-machine" ]; then
            log_success "  - Docker Machine addon: installed"
        else
            log_warn "  - Docker Machine addon: not installed"
        fi
    else
        log_error "Addon directory: $ADDON_DIR not found"
    fi
    
    echo ""
}

# Main installation flow
main() {
    log_info "Starting OpenNebula Docker & Kubernetes addon installation"
    echo ""
    
    # Check prerequisites
    log_info "Checking prerequisites..."
    
    if ! command -v git &> /dev/null; then
        log_error "git is not installed. Please install it first."
        exit 1
    fi
    
    # Setup addon permissions
    setup_addon_permissions
    echo ""
    
    # Ask user what to install
    echo "What would you like to install?"
    echo "1) Docker only"
    echo "2) Kubernetes (OneKE) only"
    echo "3) Both Docker and Kubernetes"
    echo "4) Setup addons directory only"
    read -p "Enter choice (1-4): " choice
    
    case $choice in
        1)
            install_docker
            ;;
        2)
            install_k8s_prerequisites
            if ! install_oneke; then
                log_warn "OneKE installation failed. Please obtain OneKE manually or use a repository with access."
            fi
            ;;
        3)
            install_docker
            install_k8s_prerequisites
            if ! install_oneke; then
                log_warn "OneKE installation failed. Docker Machine installation will continue."
            fi
            install_docker_machine
            ;;
        4)
            log_success "Addon directory setup complete"
            ;;
        *)
            log_error "Invalid choice"
            exit 1
            ;;
    esac
    
    echo ""
    verify_installation
    
    echo ""
    log_success "Installation complete!"
    echo ""
    echo "Next steps:"
    echo "1. Configure OpenNebula to use the addons"
    echo "2. Access the Addons UI at http://localhost:5173/addons"
    echo "3. Deploy Kubernetes clusters or Docker containers"
    echo ""
    echo "For more information, visit:"
    echo "  - Docker docs: https://docs.docker.com"
    echo "  - OneKE docs: https://docs.opennebula.io/oneke"
    echo ""
}

# Run main function
main "$@"
